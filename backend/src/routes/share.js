import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  generateShareToken,
  buildEmbedSnippet,
  computeTrustScore,
  sanitizeVehiclePublic,
  sanitizeEventPublic,
  publicShareMeta,
} from '../lib/share.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);
router.use(requireRole('OWNER'));

async function getOwnedVehicle(vehicleId, ownerId) {
  return prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerId, status: 'ACTIVE' },
    include: { badge: true, events: { select: { verified: true, source: true, eventType: true, date: true } } },
  });
}

function shareStats(vehicle) {
  const totalEvents = vehicle.events?.length ?? 0;
  const verifiedCount = vehicle.events?.filter((event) => event.verified).length ?? 0;
  const shopVerifiedCount = vehicle.events?.filter((event) => event.verified && event.source === 'SHOP').length ?? 0;
  return {
    totalEvents,
    verifiedCount,
    shopVerifiedCount,
    selfReportedCount: Math.max(totalEvents - verifiedCount, 0),
    trustScore: computeTrustScore(vehicle.events ?? []),
  };
}

router.get('/', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const shareUrl = vehicle.shareToken
    ? `${process.env.APP_BASE_URL || 'http://localhost:5173'}/history/${vehicle.shareToken}`
    : null;

  res.json({
    share: {
      visibility: vehicle.visibility,
      shareLevel: vehicle.shareLevel,
      shareToken: vehicle.shareToken,
      shareUrl,
      badge: vehicle.badge,
      embedCode: vehicle.badge?.embedCode ?? null,
      vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
      stats: shareStats(vehicle),
    },
  });
});

/**
 * Owner-only preview of exactly what a buyer sees at a given detail level,
 * built with the same sanitizers as the public endpoint. Works before any
 * share link exists so the owner never has to choose blind.
 */
router.get('/preview', async (req, res) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: req.params.vehicleId, ownerId: req.user.id, status: 'ACTIVE' },
    include: {
      events: {
        orderBy: { date: 'desc' },
        include: {
          documents: { select: { id: true, fileName: true } },
          verification: {
            select: {
              status: true,
              verifiedAt: true,
              notes: true,
              shop: { select: { id: true, shopName: true, fullName: true } },
            },
          },
          createdByShop: { select: { id: true, shopName: true, fullName: true } },
        },
      },
    },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const level = req.query.level === 'SUMMARY' ? 'SUMMARY' : 'FULL';
  const previewVehicle = { ...vehicle, shareLevel: level, shareToken: vehicle.shareToken || 'preview' };

  res.json({
    vehicle: sanitizeVehiclePublic(previewVehicle),
    events: vehicle.events.map((e) => sanitizeEventPublic(e, level)),
    trustScore: computeTrustScore(vehicle.events),
    share: publicShareMeta(previewVehicle),
  });
});

router.post('/enable', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const { shareLevel, visibility } = req.body;
  const token = vehicle.shareToken || generateShareToken();

  const updated = await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: {
      shareToken: token,
      shareLevel: shareLevel && shareLevel !== 'NONE' ? shareLevel : 'FULL',
      shareEverEnabled: true,
      ...(visibility && { visibility }),
    },
    include: { badge: true },
  });

  const appBase = process.env.APP_BASE_URL || 'http://localhost:5173';
  res.json({
    share: {
      shareToken: updated.shareToken,
      shareLevel: updated.shareLevel,
      visibility: updated.visibility,
      shareUrl: `${appBase}/history/${updated.shareToken}`,
    },
  });
});

router.patch('/', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const { visibility, shareLevel } = req.body;
  const updated = await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: {
      ...(visibility && { visibility }),
      ...(shareLevel !== undefined && {
        shareLevel,
        ...(shareLevel === 'NONE' && { shareToken: null }),
      }),
    },
    include: { badge: true },
  });

  const appBase = process.env.APP_BASE_URL || 'http://localhost:5173';
  res.json({
    share: {
      visibility: updated.visibility,
      shareLevel: updated.shareLevel,
      shareToken: updated.shareToken,
      shareUrl: updated.shareToken ? `${appBase}/history/${updated.shareToken}` : null,
      badge: updated.badge,
    },
  });
});

/**
 * Rotate the share token only. Must not touch events, mileage, trust score,
 * shareLevel, visibility, or any other vehicle fields.
 */
router.post('/regenerate-token', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (vehicle.shareLevel === 'NONE') {
    return res.status(400).json({ error: 'Enable sharing first before regenerating the link.' });
  }

  const token = generateShareToken();
  const updated = await prisma.vehicle.update({
    where: { id: vehicle.id },
    // Intentionally only shareToken (+ mark ever-enabled). No history/trust changes.
    data: { shareToken: token, shareEverEnabled: true },
  });

  const appBase = process.env.APP_BASE_URL || 'http://localhost:5173';
  res.json({
    shareToken: updated.shareToken,
    shareUrl: `${appBase}/history/${updated.shareToken}`,
    message: 'Share link rotated. History and trust score are unchanged.',
  });
});

router.post('/badge', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  let shareToken = vehicle.shareToken;
  let shareLevel = vehicle.shareLevel;
  if (!shareToken || shareLevel === 'NONE') {
    shareToken = generateShareToken();
    shareLevel = 'FULL';
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { shareToken, shareLevel, shareEverEnabled: true },
    });
  }

  const isAnimated = req.body?.isAnimated !== false;
  const apiBase = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const appBase = process.env.APP_BASE_URL || 'http://localhost:5173';
  const embedCode = buildEmbedSnippet(apiBase, shareToken, isAnimated, appBase);

  const badge = await prisma.badge.upsert({
    where: { vehicleId: vehicle.id },
    create: { vehicleId: vehicle.id, embedCode, isAnimated },
    update: { embedCode, isAnimated },
  });

  res.json({
    badge,
    shareUrl: `${appBase}/history/${shareToken}`,
    embedCode,
  });
});

export default router;

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { generateShareToken, buildEmbedSnippet } from '../lib/share.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);
router.use(requireRole('OWNER'));

async function getOwnedVehicle(vehicleId, ownerId) {
  return prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerId },
    include: { badge: true, events: { select: { verified: true, source: true } } },
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
    trustScore: totalEvents ? Math.round((verifiedCount / totalEvents) * 100) : 0,
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

router.post('/regenerate-token', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (vehicle.shareLevel === 'NONE') {
    return res.status(400).json({ error: 'Enable sharing first' });
  }

  const token = generateShareToken();
  const updated = await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { shareToken: token },
  });

  const appBase = process.env.APP_BASE_URL || 'http://localhost:5173';
  res.json({
    shareToken: updated.shareToken,
    shareUrl: `${appBase}/history/${updated.shareToken}`,
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
      data: { shareToken, shareLevel },
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

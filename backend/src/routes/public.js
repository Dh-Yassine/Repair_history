import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  canAccessPublic,
  sanitizeVehiclePublic,
  sanitizeEventPublic,
  publicShareMeta,
} from '../lib/share.js';

const router = Router();

async function loadVehicleByToken(token) {
  return prisma.vehicle.findUnique({
    where: { shareToken: token },
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
      badge: true,
    },
  });
}

function computeTrustScore(vehicle) {
  const total = vehicle.events.length;
  if (total === 0) return 0;
  const verified = vehicle.events.filter((e) => e.verified).length;
  return Math.round((verified / total) * 100);
}

router.get('/history/:token', async (req, res) => {
  const vehicle = await loadVehicleByToken(req.params.token);
  if (!vehicle) return res.status(404).json({ error: 'History not found' });

  const partnerKey = req.headers['x-partner-key'] || req.query.partnerKey;
  const access = canAccessPublic(vehicle, { partnerKey: String(partnerKey || '') });
  if (!access.allowed) {
    const message =
      access.reason === 'partner_key_required'
        ? 'This history requires a partner key. Open the link from your insurer or dealer integration.'
        : access.reason === 'disabled'
          ? 'Sharing is turned off for this vehicle.'
          : 'This history is not available.';
    return res.status(403).json({ error: message, reason: access.reason });
  }

  const events = vehicle.events.map((e) => sanitizeEventPublic(e, vehicle.shareLevel));

  prisma.badgeEvent
    .create({ data: { shareToken: vehicle.shareToken, eventType: 'history_view' } })
    .catch(() => {});

  res.json({
    vehicle: sanitizeVehiclePublic({ ...vehicle, events: vehicle.events }),
    events,
    share: publicShareMeta(vehicle),
    badge: vehicle.badge
      ? { isAnimated: vehicle.badge.isAnimated, trustScore: computeTrustScore(vehicle) }
      : null,
  });
});

router.get('/history/:token/badge', async (req, res) => {
  const vehicle = await loadVehicleByToken(req.params.token);
  if (!vehicle) return res.status(404).json({ error: 'Badge not found' });

  const partnerKey = req.headers['x-partner-key'] || req.query.partnerKey;
  const access = canAccessPublic(vehicle, { partnerKey: String(partnerKey || '') });
  if (!access.allowed) {
    return res.status(403).json({ error: 'Not available', reason: access.reason });
  }

  res.json({
    token: vehicle.shareToken,
    vehicle: sanitizeVehiclePublic(vehicle),
    trustScore: computeTrustScore(vehicle),
    verifiedCount: vehicle.events.filter((e) => e.verified).length,
    totalEvents: vehicle.events.length,
    isAnimated: vehicle.badge?.isAnimated ?? true,
  });
});

export default router;

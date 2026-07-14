import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  canAccessPublic,
  computeTrustScore,
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
    trustScore: computeTrustScore(vehicle.events),
    share: publicShareMeta(vehicle),
    badge: vehicle.badge
      ? { isAnimated: vehicle.badge.isAnimated, trustScore: computeTrustScore(vehicle.events) }
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
    trustScore: computeTrustScore(vehicle.events),
    verifiedCount: vehicle.events.filter((e) => e.verified).length,
    totalEvents: vehicle.events.length,
    isAnimated: vehicle.badge?.isAnimated ?? true,
  });
});

/** Record a site page view (public, fire-and-forget from the SPA). */
router.post('/visits', async (req, res) => {
  try {
    let path = typeof req.body?.path === 'string' ? req.body.path.trim().slice(0, 500) : '';
    const sessionId =
      typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim().slice(0, 80) : '';
    if (path && !path.startsWith('/')) path = `/${path}`;
    if (!path || !sessionId || !path.startsWith('/')) {
      // Soft-fail: never break navigation tracking clients
      return res.status(204).end();
    }

    const referrer =
      typeof req.body?.referrer === 'string' ? req.body.referrer.trim().slice(0, 1000) || null : null;
    const userAgent =
      typeof req.body?.userAgent === 'string'
        ? req.body.userAgent.trim().slice(0, 500) || null
        : typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent'].slice(0, 500)
          : null;
    const userId =
      typeof req.body?.userId === 'string' && req.body.userId.length <= 64
        ? req.body.userId
        : null;

    await prisma.siteVisit.create({
      data: { path, sessionId, referrer, userAgent, userId },
    });
    res.status(204).end();
  } catch (err) {
    console.error('visit track failed:', err.message);
    // Table missing / DB hiccup — don't surface as client errors
    res.status(204).end();
  }
});

export default router;

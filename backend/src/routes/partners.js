import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function requirePartnerKey(req, res, next) {
  const key = req.headers['x-partner-key'] || req.query.partnerKey;
  const expected = process.env.PARTNER_API_KEY;
  if (!expected || key !== expected) {
    return res.status(403).json({ error: 'Valid partner API key required' });
  }
  next();
}

router.get('/featured-shops', async (_req, res) => {
  const now = new Date();
  const ads = await prisma.featuredShopAd.findMany({
    where: { active: true, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    include: {
      shop: { select: { id: true, shopName: true, address: true, shopVerified: true } },
    },
    take: 6,
  });
  res.json({ ads });
});

router.post('/badge-events', async (req, res) => {
  const { shareToken, eventType, referrer } = req.body;
  if (!shareToken || !eventType) {
    return res.status(400).json({ error: 'shareToken and eventType required' });
  }
  await prisma.badgeEvent.create({
    data: { shareToken, eventType, referrer: referrer || null },
  });
  res.status(201).json({ ok: true });
});

router.get('/badge-analytics', requirePartnerKey, async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const events = await prisma.badgeEvent.findMany({
    where: { createdAt: { gte: since } },
  });

  const byType = {};
  const byToken = {};
  for (const e of events) {
    byType[e.eventType] = (byType[e.eventType] || 0) + 1;
    byToken[e.shareToken] = (byToken[e.shareToken] || 0) + 1;
  }

  const clicks = byType.click || 0;
  const views = byType.embed_load || 0;
  const conversionRate = views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0;

  res.json({
    period: '30d',
    totalEvents: events.length,
    byType,
    uniqueBadges: Object.keys(byToken).length,
    conversionRate,
    topBadges: Object.entries(byToken)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([token, count]) => ({ token: token.slice(0, 8) + '…', count })),
  });
});

router.post('/featured-shops', requireAuth, requireRole('SHOP', 'ADMIN'), async (req, res) => {
  const shopId = req.user.role === 'ADMIN' ? req.body.shopId : req.user.id;
  if (!shopId) return res.status(400).json({ error: 'shopId required' });

  const { ctaButton, startDate, endDate, days = 30 } = req.body;
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + days * 86400000);

  const ad = await prisma.featuredShopAd.create({
    data: {
      shopId,
      ctaButton: ctaButton || 'Book Now',
      startDate: start,
      endDate: end,
      active: true,
    },
    include: { shop: { select: { shopName: true } } },
  });
  res.status(201).json({ ad });
});

export default router;

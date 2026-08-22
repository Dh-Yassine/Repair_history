import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/stats', async (_req, res) => {
  const [users, shops, vehicles, events, flagged, reports, pendingShops] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'SHOP' } }),
    prisma.vehicle.count(),
    prisma.maintenanceEvent.count(),
    prisma.maintenanceEvent.count({ where: { flagged: true } }),
    prisma.moderationReport.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { role: 'SHOP', shopVerified: false, banned: false, deletedAt: null } }),
  ]);
  res.json({
    users,
    shops,
    vehicles,
    events,
    flaggedEvents: flagged,
    pendingReports: reports,
    pendingShops,
  });
});

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      banned: true,
      shopName: true,
      shopVerified: true,
      address: true,
      createdAt: true,
      _count: { select: { vehicles: true } },
    },
    take: 100,
  });
  res.json({ users });
});

router.get('/shops/pending', async (_req, res) => {
  const shops = await prisma.user.findMany({
    where: { role: 'SHOP', shopVerified: false, banned: false, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      shopName: true,
      address: true,
      shopVerified: true,
      createdAt: true,
    },
    take: 100,
  });
  res.json({ shops });
});

router.patch('/shops/:id/verify', async (req, res) => {
  const { approved } = req.body;
  const shop = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!shop || shop.role !== 'SHOP') {
    return res.status(404).json({ error: 'Shop not found' });
  }

  if (approved === false) {
    const updated = await prisma.user.update({
      where: { id: shop.id },
      data: { banned: true, shopVerified: false },
    });
    return res.json({
      shop: {
        id: updated.id,
        shopVerified: updated.shopVerified,
        banned: updated.banned,
      },
    });
  }

  const updated = await prisma.user.update({
    where: { id: shop.id },
    data: { shopVerified: true, banned: false },
  });

  try {
    const { notifyUser, emailUser } = await import('../lib/notify.js');
    await notifyUser(
      shop.id,
      'Your repair shop account is approved. You can create verified service records now.',
      'shop_approved'
    );
    await emailUser(
      shop.id,
      'AutoHistory shop approved',
      'Your repair shop account on AutoHistory is approved. Sign in to create verified service records for your customers.'
    );
  } catch (err) {
    console.error('Shop approval notify failed:', err);
  }

  res.json({
    shop: {
      id: updated.id,
      shopVerified: updated.shopVerified,
      banned: updated.banned,
    },
  });
});

router.patch('/users/:id/ban', async (req, res) => {
  const { banned } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { banned: !!banned },
  });
  res.json({ user: { id: user.id, banned: user.banned } });
});

router.get('/events/flagged', async (_req, res) => {
  const events = await prisma.maintenanceEvent.findMany({
    where: { flagged: true },
    orderBy: { updatedAt: 'desc' },
    include: {
      vehicle: { select: { make: true, model: true, year: true, owner: { select: { email: true } } } },
    },
    take: 50,
  });
  res.json({ events });
});

router.patch('/events/:id/flag', async (req, res) => {
  const { flagged } = req.body;
  const event = await prisma.maintenanceEvent.update({
    where: { id: req.params.id },
    data: { flagged: flagged !== false },
  });
  res.json({ event: { id: event.id, flagged: event.flagged } });
});

router.get('/reports', async (_req, res) => {
  const reports = await prisma.moderationReport.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ reports });
});

router.patch('/reports/:id', async (req, res) => {
  const { status, flagTarget } = req.body;
  const report = await prisma.moderationReport.update({
    where: { id: req.params.id },
    data: { status: status || 'RESOLVED', resolvedAt: new Date() },
  });
  if (flagTarget && report.targetType === 'event') {
    await prisma.maintenanceEvent.update({
      where: { id: report.targetId },
      data: { flagged: true },
    });
  }
  res.json({ report });
});

router.get('/featured-ads', async (_req, res) => {
  const ads = await prisma.featuredShopAd.findMany({
    include: { shop: { select: { shopName: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ ads });
});

router.post('/seed-reports-demo', async (_req, res) => {
  const event = await prisma.maintenanceEvent.findFirst();
  if (!event) return res.json({ created: 0 });
  await prisma.moderationReport.create({
    data: {
      targetType: 'event',
      targetId: event.id,
      reason: 'Suspicious mileage jump — demo report',
      status: 'PENDING',
    },
  });
  res.json({ ok: true });
});

const RANGE_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

router.get('/visits', async (req, res) => {
  const rangeKey = String(req.query.range || '7d');
  const rangeMs = RANGE_MS[rangeKey] || RANGE_MS['7d'];
  const since = new Date(Date.now() - rangeMs);

  const visits = await prisma.siteVisit.findMany({
    where: { createdAt: { gte: since } },
    select: { path: true, sessionId: true, createdAt: true, referrer: true, userId: true },
    orderBy: { createdAt: 'asc' },
  });

  const sessions = new Set();
  const signedIn = new Set();
  const byPath = new Map();
  const byDay = new Map();
  const recent = [];

  for (const v of visits) {
    sessions.add(v.sessionId);
    if (v.userId) signedIn.add(v.userId);
    byPath.set(v.path, (byPath.get(v.path) || 0) + 1);

    const dayKey = v.createdAt.toISOString().slice(0, 10);
    byDay.set(dayKey, (byDay.get(dayKey) || 0) + 1);
  }

  // Most recent first for the live feed (cap at 40)
  for (let i = visits.length - 1; i >= 0 && recent.length < 40; i--) {
    const v = visits[i];
    recent.push({
      path: v.path,
      sessionId: v.sessionId.slice(0, 8),
      createdAt: v.createdAt,
      referrer: v.referrer,
      signedIn: Boolean(v.userId),
    });
  }

  const topPaths = [...byPath.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, count]) => ({ path, count }));

  const timeline = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  res.json({
    range: RANGE_MS[rangeKey] ? rangeKey : '7d',
    since: since.toISOString(),
    totalVisits: visits.length,
    uniqueVisitors: sessions.size,
    signedInVisitors: signedIn.size,
    topPaths,
    timeline,
    recent,
  });
});

export default router;

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/stats', async (_req, res) => {
  const [users, shops, vehicles, events, flagged, reports] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'SHOP' } }),
    prisma.vehicle.count(),
    prisma.maintenanceEvent.count(),
    prisma.maintenanceEvent.count({ where: { flagged: true } }),
    prisma.moderationReport.count({ where: { status: 'PENDING' } }),
  ]);
  res.json({ users, shops, vehicles, events, flaggedEvents: flagged, pendingReports: reports });
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
      createdAt: true,
      _count: { select: { vehicles: true } },
    },
    take: 100,
  });
  res.json({ users });
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

export default router;

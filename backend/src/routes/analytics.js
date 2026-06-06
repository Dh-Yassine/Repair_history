import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { computeOwnerAnalytics, computeShopAnalytics } from '../lib/analytics.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/owner', requireRole('OWNER'), async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId: req.user.id },
    include: {
      events: {
        orderBy: { date: 'desc' },
        include: {
          verification: { include: { shop: { select: { id: true, shopName: true, fullName: true } } } },
          createdByShop: { select: { id: true, shopName: true, fullName: true } },
        },
      },
    },
  });
  res.json({ analytics: computeOwnerAnalytics(vehicles) });
});

router.get('/shop', requireRole('SHOP'), async (req, res) => {
  const verifications = await prisma.verification.findMany({
    where: { shopId: req.user.id },
    orderBy: { verifiedAt: 'desc' },
    include: {
      event: { include: { vehicle: { select: { make: true, model: true, year: true } } } },
    },
  });
  const pendingCount = await prisma.maintenanceEvent.count({
    where: { verified: false, verification: null, source: 'OWNER', createdByShopId: null },
  });
  res.json({ analytics: computeShopAnalytics(req.user.id, verifications, pendingCount) });
});

export default router;

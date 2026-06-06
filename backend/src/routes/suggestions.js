import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getMaintenanceSuggestions } from '../lib/suggestions.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);
router.use(requireRole('OWNER'));

router.get('/', async (req, res) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: req.params.vehicleId, ownerId: req.user.id },
    include: { events: { orderBy: { date: 'desc' } } },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const suggestions = getMaintenanceSuggestions(vehicle, vehicle.events);
  res.json({ suggestions });
});

export default router;

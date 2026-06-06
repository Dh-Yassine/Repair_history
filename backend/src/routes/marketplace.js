import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/parts', requireAuth, requireRole('OWNER'), async (req, res) => {
  const { vehicleId } = req.query;
  if (!vehicleId) return res.status(400).json({ error: 'vehicleId required' });

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: String(vehicleId), ownerId: req.user.id },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const allParts = await prisma.sparePart.findMany({ where: { active: true }, orderBy: { price: 'asc' } });
  const parts = allParts
    .filter((p) => {
      if (!p.make) return true;
      if (p.make !== vehicle.make) return false;
      if (p.model && p.model !== vehicle.model) return false;
      if (p.yearMin != null && vehicle.year < p.yearMin) return false;
      if (p.yearMax != null && vehicle.year > p.yearMax) return false;
      return true;
    })
    .slice(0, 24);

  res.json({
    vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
    parts: parts.map((p) => ({
      ...p,
      fitsVehicle: !p.make || (p.make === vehicle.make && (!p.model || p.model === vehicle.model)),
    })),
  });
});

router.post('/parts/:id/click', requireAuth, async (req, res) => {
  res.json({ ok: true, message: 'Click tracked (demo)' });
});

export default router;

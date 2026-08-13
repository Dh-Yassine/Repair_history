import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { formParser } from '../lib/upload.js';
import { assertEventDate, assertMileageNotBelowVehicle } from '../lib/integrity.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);
router.use(requireRole('OWNER'));

function readFields(req) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  return {
    eventType: body.eventType,
    date: body.date,
    mileage: body.mileage,
    garageName: body.garageName,
    notes: body.notes,
    cost: body.cost,
  };
}

async function getOwnedVehicle(vehicleId, ownerId) {
  return prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerId, status: 'ACTIVE' },
  });
}

function buildEventFilters(query) {
  const where = {};
  if (query.eventType) where.eventType = query.eventType;
  if (query.source) where.source = query.source;
  if (query.verified !== undefined) where.verified = query.verified === 'true';
  if (query.dateFrom || query.dateTo) {
    where.date = {};
    if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
    if (query.dateTo) where.date.lte = new Date(query.dateTo);
  }
  if (query.mileageMin !== undefined || query.mileageMax !== undefined) {
    where.mileage = {};
    if (query.mileageMin !== undefined) where.mileage.gte = parseFloat(query.mileageMin);
    if (query.mileageMax !== undefined) where.mileage.lte = parseFloat(query.mileageMax);
  }
  return where;
}

router.get('/', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const events = await prisma.maintenanceEvent.findMany({
    where: { vehicleId: vehicle.id, ...buildEventFilters(req.query) },
    orderBy: [{ mileage: 'desc' }, { date: 'desc' }],
    include: {
      documents: true,
      verification: { include: { shop: { select: { id: true, shopName: true, fullName: true } } } },
      createdByShop: { select: { id: true, shopName: true, fullName: true } },
    },
  });
  res.json({ events });
});

router.post('/', (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return formParser(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Invalid form data' });
      next();
    });
  }
  next();
}, async (req, res) => {
  try {
    const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const { eventType, date, mileage, garageName, notes, cost } = readFields(req);
    if (!eventType?.trim() || !date) {
      return res.status(400).json({ error: 'Service type and date are required' });
    }
    if (mileage === undefined || mileage === null || mileage === '') {
      return res.status(400).json({ error: 'mileage is required' });
    }

    const parsedMileage = parseFloat(mileage);
    const mileageErr = assertMileageNotBelowVehicle(parsedMileage, vehicle.mileage);
    if (mileageErr) return res.status(400).json(mileageErr);

    const parsedDate = new Date(date);
    const dateErr = assertEventDate(parsedDate, vehicle.year);
    if (dateErr) return res.status(400).json(dateErr);

    let parsedCost = null;
    if (cost !== undefined && cost !== null && cost !== '') {
      parsedCost = parseFloat(cost);
      if (Number.isNaN(parsedCost)) {
        return res.status(400).json({ error: 'cost must be a valid number' });
      }
    }

    const event = await prisma.maintenanceEvent.create({
      data: {
        vehicleId: vehicle.id,
        eventType: eventType.trim(),
        date: parsedDate,
        mileage: parsedMileage,
        cost: parsedCost,
        garageName: garageName?.trim() || null,
        notes: notes?.trim() || null,
        verified: false,
        source: 'OWNER',
        createdByShopId: null,
      },
      include: {
        documents: true,
        verification: { include: { shop: { select: { id: true, shopName: true, fullName: true } } } },
        createdByShop: { select: { id: true, shopName: true, fullName: true } },
      },
    });

    const { generateRemindersFromEvents } = await import('../lib/reminders.js');
    generateRemindersFromEvents(vehicle.id).catch(console.error);

    if (parsedMileage > vehicle.mileage) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { mileage: parsedMileage },
      });
    }

    res.status(201).json({ event });
  } catch (err) {
    console.error('create event failed:', err);
    res.status(500).json({ error: err.message || 'Failed to create event' });
  }
});

router.get('/:eventId', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const event = await prisma.maintenanceEvent.findFirst({
    where: { id: req.params.eventId, vehicleId: vehicle.id },
    include: {
      documents: true,
      verification: { include: { shop: { select: { id: true, shopName: true, fullName: true } } } },
      createdByShop: { select: { id: true, shopName: true, fullName: true } },
    },
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({ event });
});

router.patch('/:eventId', (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return formParser(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Invalid form data' });
      next();
    });
  }
  next();
}, async (req, res) => {
  try {
    const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const existing = await prisma.maintenanceEvent.findFirst({
      where: { id: req.params.eventId, vehicleId: vehicle.id },
    });
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    if (existing.source === 'SHOP' || existing.verified) {
      return res.status(403).json({ error: 'Verified shop records cannot be edited by the owner' });
    }

    const { eventType, date, mileage, garageName, notes, cost } = readFields(req);

    let nextMileage = existing.mileage;
    if (mileage !== undefined && mileage !== null && mileage !== '') {
      nextMileage = parseFloat(mileage);
      // Floor is the vehicle's stored odometer. If this event currently equals
      // the vehicle mileage, lowering it would violate monotonic odometer history.
      const mileageErr = assertMileageNotBelowVehicle(nextMileage, vehicle.mileage);
      if (mileageErr) return res.status(400).json(mileageErr);
    }

    let nextDate = existing.date;
    if (date !== undefined && date !== null && date !== '') {
      nextDate = new Date(date);
      const dateErr = assertEventDate(nextDate, vehicle.year);
      if (dateErr) return res.status(400).json(dateErr);
    }

    const event = await prisma.maintenanceEvent.update({
      where: { id: req.params.eventId },
      data: {
        ...(eventType !== undefined && { eventType: eventType.trim() }),
        ...(date !== undefined && date !== null && date !== '' && { date: nextDate }),
        ...(mileage !== undefined && mileage !== null && mileage !== '' && { mileage: nextMileage }),
        ...(cost !== undefined && { cost: cost === '' || cost == null ? null : parseFloat(cost) }),
        ...(garageName !== undefined && { garageName: garageName?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: {
        documents: true,
        verification: { include: { shop: { select: { id: true, shopName: true, fullName: true } } } },
        createdByShop: { select: { id: true, shopName: true, fullName: true } },
      },
    });

    if (nextMileage > vehicle.mileage) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { mileage: nextMileage },
      });
    }

    res.json({ event });
  } catch (err) {
    console.error('update event failed:', err);
    res.status(500).json({ error: err.message || 'Failed to update event' });
  }
});

router.delete('/:eventId', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.vehicleId, req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const existing = await prisma.maintenanceEvent.findFirst({
    where: { id: req.params.eventId, vehicleId: vehicle.id },
  });
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  if (existing.source === 'SHOP' || existing.verified) {
    return res.status(403).json({ error: 'Verified shop records cannot be deleted by the owner' });
  }

  await prisma.maintenanceEvent.delete({ where: { id: req.params.eventId } });
  res.status(204).send();
});

export default router;

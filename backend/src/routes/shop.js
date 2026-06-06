import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { notifyUser } from '../lib/notify.js';
import { sendEmail } from '../lib/email.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { memoryUpload } from '../lib/upload.js';
import { BUCKETS, documentKey, resolveFileUrl, saveUpload } from '../lib/storage.js';

const upload = memoryUpload({ maxSize: 10 * 1024 * 1024 });

async function saveProof(req) {
  if (!req.file) return null;
  const key = documentKey(req.file.originalname);
  return saveUpload(BUCKETS.proofs, key, req.file.buffer, req.file.mimetype);
}

const router = Router();
router.use(requireAuth);
router.use(requireRole('SHOP'));

router.get('/profile', async (req, res) => {
  const shop = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  const { passwordHash: _, ...profile } = shop;
  res.json({ shop: profile });
});

router.get('/events', async (req, res) => {
  const shop = await prisma.user.findUnique({ where: { id: req.user.id } });
  const shopName = shop?.shopName?.trim() ?? null;

  const events = await prisma.maintenanceEvent.findMany({
    where: {
      verified: false,
      verification: null,
      source: 'OWNER',
      createdByShopId: null,
    },
    orderBy: { date: 'desc' },
    include: {
      vehicle: {
        select: { id: true, make: true, model: true, year: true, vin: true, serialNumber: true, mileage: true },
      },
      documents: { select: { id: true, fileName: true, fileType: true } },
    },
    take: 100,
  });

  res.json({ events, shopName });
});

router.post('/vehicles/lookup', async (req, res) => {
  const { ownerEmail, vin, serialNumber, make, model, year } = req.body;
  if (!ownerEmail?.trim()) {
    return res.status(400).json({ error: 'ownerEmail is required' });
  }

  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail.trim().toLowerCase() },
    select: { id: true, fullName: true, email: true, vehicles: true },
  });
  if (!owner) return res.status(404).json({ error: 'Owner not found' });

  const normalizedVin = vin?.trim().toUpperCase();
  const normalizedSerial = serialNumber?.trim().toUpperCase();
  const hasVehicleCriteria = Boolean(normalizedVin || normalizedSerial || make?.trim() || model?.trim() || year);
  const vehicles = owner.vehicles.filter((vehicle) => {
    if (!hasVehicleCriteria) return true;
    if (normalizedVin && vehicle.vin?.toUpperCase() === normalizedVin) return true;
    if (normalizedSerial && vehicle.serialNumber?.toUpperCase() === normalizedSerial) return true;
    if (make?.trim() && vehicle.make.toLowerCase() !== make.trim().toLowerCase()) return false;
    if (model?.trim() && vehicle.model.toLowerCase() !== model.trim().toLowerCase()) return false;
    if (year && vehicle.year !== Number(year)) return false;
    return true;
  });

  res.json({
    owner: { id: owner.id, fullName: owner.fullName, email: owner.email },
    vehicles,
  });
});

router.get('/verifications', async (req, res) => {
  const verifications = await prisma.verification.findMany({
    where: { shopId: req.user.id },
    orderBy: { verifiedAt: 'desc' },
    include: {
      event: {
        include: {
          vehicle: { select: { make: true, model: true, year: true } },
        },
      },
    },
    take: 50,
  });
  res.json({ verifications });
});

router.post('/events', upload.single('proof'), async (req, res) => {
  try {
    const {
      ownerEmail,
      vehicleId,
      vin,
      serialNumber,
      make,
      model,
      year,
      eventType,
      date,
      mileage,
      cost,
      notes,
      verificationNotes,
    } = req.body;

    if (!ownerEmail?.trim() || !eventType?.trim() || !date || mileage === undefined) {
      return res.status(400).json({ error: 'ownerEmail, eventType, date, and mileage are required' });
    }

    const shop = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const owner = await prisma.user.findUnique({
      where: { email: ownerEmail.trim().toLowerCase() },
      include: { vehicles: true },
    });
    if (!owner || owner.role !== 'OWNER') {
      return res.status(404).json({ error: 'Owner not found' });
    }

    const normalizedVin = vin?.trim().toUpperCase();
    const normalizedSerial = serialNumber?.trim().toUpperCase();
    const vehicle =
      owner.vehicles.find((v) => vehicleId && v.id === vehicleId) ||
      owner.vehicles.find((v) => normalizedVin && v.vin?.toUpperCase() === normalizedVin) ||
      owner.vehicles.find((v) => normalizedSerial && v.serialNumber?.toUpperCase() === normalizedSerial) ||
      owner.vehicles.find((v) => {
        if (make?.trim() && v.make.toLowerCase() !== make.trim().toLowerCase()) return false;
        if (model?.trim() && v.model.toLowerCase() !== model.trim().toLowerCase()) return false;
        if (year && v.year !== Number(year)) return false;
        return Boolean(make?.trim() || model?.trim() || year);
      });

    if (!vehicle) {
      return res.status(404).json({ error: 'Matching owner vehicle not found' });
    }

    const parsedMileage = parseFloat(mileage);
    const parsedCost = cost !== undefined && cost !== '' ? parseFloat(cost) : null;
    if (Number.isNaN(parsedMileage)) {
      return res.status(400).json({ error: 'mileage must be a number' });
    }

    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceEvent.create({
        data: {
          vehicleId: vehicle.id,
          createdByShopId: shop.id,
          source: 'SHOP',
          eventType: eventType.trim(),
          date: new Date(date),
          mileage: parsedMileage,
          cost: parsedCost,
          garageName: shop.shopName || shop.fullName,
          notes: notes?.trim() || null,
          verified: true,
          verification: {
            create: {
              shopId: shop.id,
              status: 'APPROVED',
              proofPath: await saveProof(req),
              notes: verificationNotes?.trim() || null,
            },
          },
        },
        include: {
          documents: { include: { ocrResult: true } },
          verification: { include: { shop: { select: { id: true, shopName: true, fullName: true } } } },
          createdByShop: { select: { id: true, shopName: true, fullName: true } },
          vehicle: { select: { id: true, make: true, model: true, year: true, vin: true, mileage: true } },
        },
      });

      if (parsedMileage > vehicle.mileage) {
        await tx.vehicle.update({ where: { id: vehicle.id }, data: { mileage: parsedMileage } });
      }

      return created;
    });

    const { generateRemindersFromEvents } = await import('../lib/reminders.js');
    generateRemindersFromEvents(vehicle.id).catch(console.error);

    const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const msg = `${shop.shopName || 'A repair shop'} added and verified ${event.eventType} for your ${vehicleLabel}.`;
    await notifyUser(owner.id, msg, 'verification');
    await sendEmail(owner.email, 'AutoHistory: verified service record added', `${msg}\n\nView your timeline in AutoHistory.`);

    res.status(201).json({ event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create verified event' });
  }
});

router.post('/events/:eventId/verify', upload.single('proof'), async (req, res) => {
  try {
    const shop = await prisma.user.findUnique({ where: { id: req.user.id } });
    const event = await prisma.maintenanceEvent.findUnique({
      where: { id: req.params.eventId },
      include: { vehicle: { include: { owner: true } }, verification: true },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.verified || event.verification) {
      return res.status(409).json({ error: 'Event already verified' });
    }

    const verification = await prisma.$transaction(async (tx) => {
      const v = await tx.verification.create({
        data: {
          eventId: event.id,
          shopId: req.user.id,
          status: 'APPROVED',
          proofPath: await saveProof(req),
          notes: req.body?.notes?.trim() || null,
        },
      });
      await tx.maintenanceEvent.update({
        where: { id: event.id },
        data: { verified: true, garageName: event.garageName || shop?.shopName || null },
      });
      return v;
    });

    const vehicleLabel = `${event.vehicle.year} ${event.vehicle.make} ${event.vehicle.model}`;
    const verifyMsg = `${shop?.shopName || 'A repair shop'} verified your ${event.eventType} on ${vehicleLabel}.`;
    await notifyUser(event.vehicle.ownerId, verifyMsg, 'verification');
    await sendEmail(
      event.vehicle.owner.email,
      'AutoHistory: maintenance verified',
      `${verifyMsg}\n\nView your timeline in AutoHistory.`
    );

    res.status(201).json({ verification, eventId: event.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

router.post('/reminders', async (req, res) => {
  try {
    const { vehicleId, serviceType, dueDate, dueMileage, message } = req.body;
    if (!vehicleId || !serviceType?.trim()) {
      return res.status(400).json({ error: 'vehicleId and serviceType are required' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const reminder = await prisma.serviceReminder.create({
      data: {
        vehicleId,
        serviceType: serviceType.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        dueMileage: dueMileage !== undefined ? parseFloat(dueMileage) : null,
        message: message?.trim() || `Appointment reminder from ${req.user.shopName || 'your repair shop'}.`,
        createdByShopId: req.user.id,
      },
    });

    const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const msg = `Shop reminder: ${serviceType} for ${label} on ${dueDate || 'upcoming mileage'}`;
    await notifyUser(vehicle.ownerId, msg, 'reminder');
    const owner = await prisma.user.findUnique({ where: { id: vehicle.ownerId } });
    await sendEmail(owner.email, 'AutoHistory: service reminder from your shop', msg);

    res.status(201).json({ reminder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

router.get('/proofs/:key', async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const url = await resolveFileUrl(BUCKETS.proofs, key);
  res.redirect(url);
});

export default router;

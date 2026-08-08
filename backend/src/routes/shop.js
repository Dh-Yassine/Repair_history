import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { notifyUser, emailUser } from '../lib/notify.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { memoryUpload } from '../lib/upload.js';
import { BUCKETS, documentKey, resolveFileUrl, saveUpload } from '../lib/storage.js';
import {
  assertEventDate,
  assertMileageNotBelowVehicle,
  assertNoShopSelfService,
} from '../lib/integrity.js';

const upload = memoryUpload({ maxSize: 10 * 1024 * 1024 });

async function saveProof(req) {
  if (!req.file) return null;
  const key = documentKey(req.file.originalname);
  return saveUpload(BUCKETS.proofs, key, req.file.buffer, req.file.mimetype);
}

/** Record that this shop has a real relationship with this owner. */
async function recordConnection(shopId, ownerId, source = 'LOOKUP') {
  if (!shopId || !ownerId || shopId === ownerId) return;
  await prisma.shopConnection.upsert({
    where: { shopId_ownerId: { shopId, ownerId } },
    create: { shopId, ownerId, source },
    // A service relationship is stronger than a lookup — upgrade, never downgrade
    update: source === 'SERVICE' ? { source } : {},
  });
}

const router = Router();
router.use(requireAuth);
router.use(requireRole('SHOP'));

/** Shops can sign in before approval, but cannot create/verify records until an admin approves. */
async function requireShopApproved(req, res, next) {
  try {
    const shop = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { shopVerified: true, banned: true, role: true },
    });
    if (!shop || shop.role !== 'SHOP') {
      return res.status(403).json({ error: 'Shop account required' });
    }
    if (shop.banned) {
      return res.status(403).json({ error: 'This shop account is banned' });
    }
    if (!shop.shopVerified) {
      return res.status(403).json({
        error: 'Your shop is pending admin approval. You can sign in, but you cannot verify records yet.',
        reason: 'shop_pending',
      });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Shop approval check failed' });
  }
}

router.get('/profile', async (req, res) => {
  const shop = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  const { passwordHash: _, ...profile } = shop;
  res.json({ shop: profile });
});

// All shop work below requires admin approval
router.use(requireShopApproved);

/**
 * Pending queue: only unverified owner reports for owners connected to this
 * shop (previous lookup or service). Never a global feed of all users' data.
 */
router.get('/events', async (req, res) => {
  const shop = await prisma.user.findUnique({ where: { id: req.user.id } });
  const shopName = shop?.shopName?.trim() ?? null;

  const connections = await prisma.shopConnection.findMany({
    where: { shopId: req.user.id },
    select: { ownerId: true },
  });
  const ownerIds = connections.map((c) => c.ownerId);

  if (ownerIds.length === 0) {
    return res.json({ events: [], shopName, connectedOwners: 0 });
  }

  const events = await prisma.maintenanceEvent.findMany({
    where: {
      verified: false,
      verification: null,
      source: 'OWNER',
      createdByShopId: null,
      vehicle: { ownerId: { in: ownerIds }, status: 'ACTIVE' },
    },
    orderBy: { date: 'desc' },
    include: {
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          vin: true,
          serialNumber: true,
          mileage: true,
          owner: { select: { fullName: true, email: true } },
        },
      },
      documents: { select: { id: true, fileName: true, fileType: true } },
    },
    take: 100,
  });

  res.json({ events, shopName, connectedOwners: ownerIds.length });
});

function readJsonBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  return body;
}

function readLookupQuery(req) {
  const body = readJsonBody(req);
  const fromQs = typeof req.query?.q === 'string' ? req.query.q : '';
  const fromEmailQs = typeof req.query?.email === 'string' ? req.query.email : '';
  return String(body.q || body.ownerEmail || body.email || fromQs || fromEmailQs || '')
    .trim()
    .replace(/\u00a0/g, ' ');
}

/**
 * Owner/vehicle lookup with a single query: email, VIN, or serial.
 * Accepts JSON body fields q / ownerEmail / email, or ?q= / ?email= query params.
 */
router.post('/vehicles/lookup', async (req, res) => {
  try {
    const body = readJsonBody(req);
    const { vin, serialNumber, make, model, year } = body;
    const query = readLookupQuery(req);

    if (!query) {
      console.warn('[shop/lookup] empty query — body keys:', Object.keys(body), 'query:', req.query);
      return res.status(400).json({
        error: 'Enter an email, VIN, or serial number to search',
        debug: { bodyKeys: Object.keys(body), hasAuth: Boolean(req.user?.id) },
      });
    }

    let owner = null;
    let vehicles = [];

    if (query.includes('@')) {
      const email = query.toLowerCase();
      owner = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          deletedAt: true,
          vehicles: { where: { status: 'ACTIVE' } },
        },
      });
      // Personal accounts may be OWNER or legacy BUYER — anything with vehicles except shop/admin
      if (!owner || owner.deletedAt || owner.role === 'SHOP' || owner.role === 'ADMIN') {
        return res.status(404).json({ error: 'No owner account found for that email.' });
      }
      vehicles = owner.vehicles;
    } else {
      const normalized = query.toUpperCase();
      const matches = await prisma.vehicle.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { vin: { contains: normalized, mode: 'insensitive' } },
            { serialNumber: { contains: normalized, mode: 'insensitive' } },
          ],
        },
        include: {
          owner: { select: { id: true, fullName: true, email: true, role: true, deletedAt: true } },
        },
        take: 10,
      });
      const valid = matches.filter(
        (v) => v.owner && !v.owner.deletedAt && v.owner.role !== 'SHOP' && v.owner.role !== 'ADMIN'
      );
      if (valid.length === 0) {
        return res.status(404).json({ error: 'No vehicle found matching that VIN or serial number.' });
      }
      owner = valid[0].owner;
      vehicles = valid.filter((v) => v.owner.id === owner.id).map(({ owner: _o, ...v }) => v);

      const normalizedVin = vin?.trim().toUpperCase();
      const normalizedSerial = serialNumber?.trim().toUpperCase();
      if (normalizedVin || normalizedSerial || make?.trim() || model?.trim() || year) {
        vehicles = vehicles.filter((vehicle) => {
          if (normalizedVin && vehicle.vin?.toUpperCase() !== normalizedVin) return false;
          if (normalizedSerial && vehicle.serialNumber?.toUpperCase() !== normalizedSerial) return false;
          if (make?.trim() && vehicle.make.toLowerCase() !== make.trim().toLowerCase()) return false;
          if (model?.trim() && vehicle.model.toLowerCase() !== model.trim().toLowerCase()) return false;
          if (year && vehicle.year !== Number(year)) return false;
          return true;
        });
      }
    }

    try {
      await recordConnection(req.user.id, owner.id, 'LOOKUP');
    } catch (connErr) {
      console.error('shop connection record failed:', connErr.message);
    }

    res.json({
      owner: { id: owner.id, fullName: owner.fullName, email: owner.email },
      vehicles,
    });
  } catch (err) {
    console.error('shop lookup failed:', err);
    res.status(500).json({ error: 'Vehicle lookup failed' });
  }
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

/** Monthly verified-record counts for the last 12 months. */
router.get('/analytics/monthly', async (req, res) => {
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const verifications = await prisma.verification.findMany({
    where: { shopId: req.user.id, verifiedAt: { gte: since } },
    select: { verifiedAt: true },
  });

  const months = [];
  const counts = new Map();
  const cursor = new Date(since);
  for (let i = 0; i < 12; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    months.push(key);
    counts.set(key, 0);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const v of verifications) {
    const d = new Date(v.verifiedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }

  res.json({ monthly: months.map((m) => ({ month: m, count: counts.get(m) })) });
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
      include: { vehicles: { where: { status: 'ACTIVE' } } },
    });
    if (!owner || owner.role !== 'OWNER') {
      return res.status(404).json({ error: 'Owner not found' });
    }

    const selfServiceErr = assertNoShopSelfService(shop.id, owner.id);
    if (selfServiceErr) return res.status(403).json(selfServiceErr);

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

    const mileageErr = assertMileageNotBelowVehicle(parsedMileage, vehicle.mileage);
    if (mileageErr) return res.status(400).json(mileageErr);

    const parsedDate = new Date(date);
    const dateErr = assertEventDate(parsedDate, vehicle.year);
    if (dateErr) return res.status(400).json(dateErr);

    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceEvent.create({
        data: {
          vehicleId: vehicle.id,
          createdByShopId: shop.id,
          source: 'SHOP',
          eventType: eventType.trim(),
          date: parsedDate,
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
          documents: true,
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

    await recordConnection(shop.id, owner.id, 'SERVICE');

    const { generateRemindersFromEvents } = await import('../lib/reminders.js');
    generateRemindersFromEvents(vehicle.id).catch(console.error);

    const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const msg = `${shop.shopName || 'A repair shop'} added and verified ${event.eventType} for your ${vehicleLabel}.`;
    await notifyUser(owner.id, msg, 'verification');
    await emailUser(owner.id, 'AutoHistory: verified service record added', `${msg}\n\nView your timeline in AutoHistory.`);

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

    const selfServiceErr = assertNoShopSelfService(req.user.id, event.vehicle.ownerId);
    if (selfServiceErr) return res.status(403).json(selfServiceErr);

    // Only verify events from owners connected to this shop
    const connection = await prisma.shopConnection.findUnique({
      where: { shopId_ownerId: { shopId: req.user.id, ownerId: event.vehicle.ownerId } },
    });
    if (!connection) {
      return res.status(403).json({
        error: 'You can only verify records for customers connected to your shop. Look the owner up first.',
      });
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

    await recordConnection(req.user.id, event.vehicle.ownerId, 'SERVICE');

    const vehicleLabel = `${event.vehicle.year} ${event.vehicle.make} ${event.vehicle.model}`;
    const verifyMsg = `${shop?.shopName || 'A repair shop'} verified your ${event.eventType} on ${vehicleLabel}.`;
    await notifyUser(event.vehicle.ownerId, verifyMsg, 'verification');
    await emailUser(
      event.vehicle.ownerId,
      'AutoHistory: maintenance verified',
      `${verifyMsg}\n\nView your timeline in AutoHistory.`
    );

    res.status(201).json({ verification, eventId: event.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

/**
 * Owner proof file for a pending report the shop is reviewing.
 * Only for unverified events of connected owners.
 */
router.get('/events/:eventId/documents/:documentId/file', async (req, res) => {
  const event = await prisma.maintenanceEvent.findUnique({
    where: { id: req.params.eventId },
    include: { vehicle: { select: { ownerId: true } } },
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.verified) return res.status(403).json({ error: 'Event is already verified' });

  const connection = await prisma.shopConnection.findUnique({
    where: { shopId_ownerId: { shopId: req.user.id, ownerId: event.vehicle.ownerId } },
  });
  if (!connection) return res.status(403).json({ error: 'Not connected to this owner' });

  const document = await prisma.document.findFirst({
    where: { id: req.params.documentId, eventId: event.id },
  });
  if (!document) return res.status(404).json({ error: 'Document not found' });

  const url = await resolveFileUrl(BUCKETS.documents, document.filePath);
  res.json({ url, fileName: document.fileName, fileType: document.fileType });
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
    await emailUser(vehicle.ownerId, 'AutoHistory: service reminder from your shop', msg);

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

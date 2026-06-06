import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getVehicleLimits } from '../lib/limits.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { memoryUpload } from '../lib/upload.js';
import { BUCKETS, deleteUpload, resolveFileUrl, saveUpload, vehiclePhotoKey } from '../lib/storage.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole('OWNER'));

const upload = memoryUpload({
  maxSize: 5 * 1024 * 1024,
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WEBP vehicle photos are allowed'));
  },
});

async function getOwnedVehicle(vehicleId, ownerId) {
  return prisma.vehicle.findFirst({ where: { id: vehicleId, ownerId } });
}

async function withPhotoUrl(vehicle) {
  if (!vehicle?.photoPath) return { ...vehicle, photoUrl: null };
  try {
    const photoUrl = await resolveFileUrl(BUCKETS.vehicles, vehicle.photoPath, { publicBucket: true });
    return { ...vehicle, photoUrl };
  } catch (err) {
    console.error('resolveFileUrl failed:', err.message);
    return { ...vehicle, photoUrl: null };
  }
}

router.get('/', async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { events: true } } },
  });
  const limits = await getVehicleLimits(req.user.id);
  const withPhotos = await Promise.all(vehicles.map(withPhotoUrl));
  res.json({ vehicles: withPhotos, limits });
});

router.post('/', (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Vehicle photo rejected' });
    next();
  });
}, async (req, res) => {
  try {
    const limits = await getVehicleLimits(req.user.id);
    if (!limits.canAdd) {
      return res.status(403).json({
        error: `Free plan allows ${limits.max} vehicles. Upgrade to add more.`,
        limits,
      });
    }

    const { vin, serialNumber, make, model, year, mileage, visibility } = req.body;
    if (!make?.trim() || !model?.trim() || year === undefined) {
      return res.status(400).json({ error: 'make, model, and year are required' });
    }

    const parsedYear = parseInt(year, 10);
    if (Number.isNaN(parsedYear)) {
      return res.status(400).json({ error: 'year must be a number' });
    }

    let photoPath = null;
    if (req.file) {
      if (!req.file.buffer?.length) {
        return res.status(400).json({ error: 'Photo upload was empty — try again or skip the photo' });
      }
      const key = vehiclePhotoKey(req.file.originalname);
      photoPath = await saveUpload(BUCKETS.vehicles, key, req.file.buffer, req.file.mimetype);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        ownerId: req.user.id,
        vin: vin?.trim().toUpperCase() || null,
        serialNumber: serialNumber?.trim().toUpperCase() || null,
        make: make.trim(),
        model: model.trim(),
        year: parsedYear,
        mileage: mileage !== undefined && mileage !== '' ? parseFloat(mileage) : 0,
        photoPath,
        visibility: visibility || 'PRIVATE',
      },
    });
    res.status(201).json({ vehicle: await withPhotoUrl(vehicle) });
  } catch (err) {
    console.error('create vehicle failed:', err);
    res.status(500).json({ error: err.message || 'Failed to create vehicle' });
  }
});

router.get('/:id', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.id, req.user.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ vehicle: await withPhotoUrl(vehicle) });
});

router.patch('/:id', (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Vehicle photo rejected' });
    next();
  });
}, async (req, res) => {
  const existing = await getOwnedVehicle(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

  let photoPath = existing.photoPath;
  if (req.file) {
    if (!req.file.buffer?.length) {
      return res.status(400).json({ error: 'Photo upload was empty — try again or skip the photo' });
    }
    if (existing.photoPath) await deleteUpload(BUCKETS.vehicles, existing.photoPath);
    const key = vehiclePhotoKey(req.file.originalname);
    photoPath = await saveUpload(BUCKETS.vehicles, key, req.file.buffer, req.file.mimetype);
  }

  const { vin, serialNumber, make, model, year, mileage, visibility } = req.body;
  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data: {
      ...(vin !== undefined && { vin: vin?.trim().toUpperCase() || null }),
      ...(serialNumber !== undefined && { serialNumber: serialNumber?.trim().toUpperCase() || null }),
      ...(make !== undefined && { make: make.trim() }),
      ...(model !== undefined && { model: model.trim() }),
      ...(year !== undefined && { year: parseInt(year, 10) }),
      ...(mileage !== undefined && { mileage: parseFloat(mileage) }),
      ...(req.file && { photoPath }),
      ...(visibility !== undefined && { visibility }),
    },
  });
  res.json({ vehicle: await withPhotoUrl(vehicle) });
});

router.delete('/:id', async (req, res) => {
  const existing = await getOwnedVehicle(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });
  if (existing.photoPath) await deleteUpload(BUCKETS.vehicles, existing.photoPath);
  await prisma.vehicle.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.get('/:id/photo', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.id, req.user.id);
  if (!vehicle?.photoPath) return res.status(404).json({ error: 'Photo not found' });
  const url = await resolveFileUrl(BUCKETS.vehicles, vehicle.photoPath, { publicBucket: true });
  res.redirect(url);
});

export default router;

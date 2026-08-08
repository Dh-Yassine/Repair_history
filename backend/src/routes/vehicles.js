import { Router } from 'express';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { getVehicleLimits } from '../lib/limits.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { memoryUpload } from '../lib/upload.js';
import { BUCKETS, deleteUpload, inferImageContentType, readUploadBuffer, resolveFileUrl, saveUpload, vehiclePhotoKey } from '../lib/storage.js';
import {
  assertVinNotCleared,
  assertVinUnique,
  canHardDeleteVehicle,
  normalizeVin,
} from '../lib/integrity.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole('OWNER'));

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

const upload = memoryUpload({
  maxSize: 5 * 1024 * 1024,
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype?.toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (IMAGE_MIMES.includes(mime)) cb(null, true);
    else if (mime === 'application/octet-stream' && IMAGE_EXTS.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WEBP vehicle photos are allowed'));
  },
});

async function getOwnedVehicle(vehicleId, ownerId, { includeArchived = false } = {}) {
  return prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      ownerId,
      ...(includeArchived ? {} : { status: 'ACTIVE' }),
    },
  });
}

async function withPhotoUrl(vehicle) {
  if (!vehicle?.photoPath) return { ...vehicle, photoUrl: null };
  try {
    const photoUrl = await resolveFileUrl(BUCKETS.vehicles, vehicle.photoPath, { publicBucket: true });
    return { ...vehicle, photoUrl };
  } catch (err) {
    console.error('resolveFileUrl (public) failed:', err.message);
    try {
      const photoUrl = await resolveFileUrl(BUCKETS.vehicles, vehicle.photoPath, { publicBucket: false });
      return { ...vehicle, photoUrl };
    } catch (fallbackErr) {
      console.error('resolveFileUrl (signed) failed:', fallbackErr.message);
      return { ...vehicle, photoUrl: null };
    }
  }
}

router.get('/', async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId: req.user.id, status: 'ACTIVE' },
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

    const { vin, serialNumber, nickname, make, model, year, mileage, visibility } = req.body;
    if (!make?.trim() || !model?.trim() || year === undefined) {
      return res.status(400).json({ error: 'make, model, and year are required' });
    }

    const parsedYear = parseInt(year, 10);
    if (Number.isNaN(parsedYear)) {
      return res.status(400).json({ error: 'year must be a number' });
    }

    const parsedMileage = mileage !== undefined && mileage !== '' ? parseFloat(mileage) : 0;
    if (Number.isNaN(parsedMileage) || parsedMileage < 0) {
      return res.status(400).json({ error: 'Mileage must be a valid number of kilometres.' });
    }

    const normalizedVin = normalizeVin(vin);
    const vinClash = await assertVinUnique(prisma, normalizedVin);
    if (vinClash) return res.status(409).json(vinClash);

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
        vin: normalizedVin,
        serialNumber: serialNumber?.trim().toUpperCase() || null,
        nickname: nickname?.trim() || null,
        make: make.trim(),
        model: model.trim(),
        year: parsedYear,
        mileage: parsedMileage,
        photoPath,
        visibility: visibility || 'PRIVATE',
        status: 'ACTIVE',
      },
    });
    res.status(201).json({ vehicle: await withPhotoUrl(vehicle) });
  } catch (err) {
    console.error('create vehicle failed:', err);
    if (err.code === 'P2002' && err.meta?.target?.includes('vin')) {
      return res.status(409).json({ error: 'This VIN is already registered.' });
    }
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
  try {
    const existing = await getOwnedVehicle(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

    let photoPath = existing.photoPath;
    const removePhoto = ['true', '1', 'yes'].includes(String(req.body.removePhoto ?? '').toLowerCase());

    if (req.file) {
      if (!req.file.buffer?.length) {
        return res.status(400).json({ error: 'Photo upload was empty — try again or skip the photo' });
      }
      if (existing.photoPath) await deleteUpload(BUCKETS.vehicles, existing.photoPath);
      const key = vehiclePhotoKey(req.file.originalname);
      photoPath = await saveUpload(BUCKETS.vehicles, key, req.file.buffer, req.file.mimetype);
    } else if (removePhoto && existing.photoPath) {
      await deleteUpload(BUCKETS.vehicles, existing.photoPath);
      photoPath = null;
    }

    const { vin, serialNumber, nickname, make, model, year, mileage, visibility } = req.body;

    if (vin !== undefined) {
      const clearErr = assertVinNotCleared(existing.vin, vin);
      if (clearErr) return res.status(400).json(clearErr);

      const normalizedVin = normalizeVin(vin);
      // If VIN already set and incoming normalizes to same value, keep it.
      // If changing to a different VIN, check uniqueness.
      if (normalizedVin && normalizedVin !== existing.vin) {
        const vinClash = await assertVinUnique(prisma, normalizedVin, existing.id);
        if (vinClash) return res.status(409).json(vinClash);
      }
      // If existing VIN and client omitted meaningful change — handled by clear check
    }

    if (mileage !== undefined && mileage !== '') {
      const parsedMileage = parseFloat(mileage);
      if (Number.isNaN(parsedMileage) || parsedMileage < 0) {
        return res.status(400).json({ error: 'Mileage must be a valid number of kilometres.' });
      }
    }

    const nextVin =
      vin === undefined
        ? undefined
        : normalizeVin(vin) ?? (existing.vin ? existing.vin : null);

    // Never allow clearing an existing VIN even if normalize returned null
    const vinUpdate =
      vin === undefined
        ? {}
        : existing.vin && !normalizeVin(vin)
          ? {} // should already have returned 400 above
          : { vin: nextVin };

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        ...vinUpdate,
        ...(serialNumber !== undefined && { serialNumber: serialNumber?.trim().toUpperCase() || null }),
        ...(nickname !== undefined && { nickname: nickname?.trim() || null }),
        ...(make !== undefined && { make: make.trim() }),
        ...(model !== undefined && { model: model.trim() }),
        ...(year !== undefined && { year: parseInt(year, 10) }),
        ...(mileage !== undefined && mileage !== '' && { mileage: parseFloat(mileage) }),
        ...(req.file || removePhoto ? { photoPath } : {}),
        ...(visibility !== undefined && { visibility }),
      },
    });
    res.json({ vehicle: await withPhotoUrl(vehicle) });
  } catch (err) {
    console.error('update vehicle failed:', err);
    if (err.code === 'P2002' && err.meta?.target?.includes('vin')) {
      return res.status(409).json({ error: 'This VIN is already registered.' });
    }
    res.status(500).json({ error: err.message || 'Failed to update vehicle' });
  }
});

/**
 * Soft-delete (archive) by default.
 * Hard delete only when zero events AND no share link was ever created.
 */
router.delete('/:id', async (req, res) => {
  try {
    const existing = await getOwnedVehicle(req.params.id, req.user.id, { includeArchived: true });
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });
    if (existing.status === 'ARCHIVED') {
      return res.status(400).json({ error: 'This vehicle is already archived.' });
    }

    const eventCount = await prisma.maintenanceEvent.count({ where: { vehicleId: existing.id } });

    if (canHardDeleteVehicle(existing, eventCount)) {
      if (existing.photoPath) await deleteUpload(BUCKETS.vehicles, existing.photoPath);
      await prisma.vehicle.delete({ where: { id: req.params.id } });
      return res.status(204).send();
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        // Keep shareToken / shareLevel / events intact for public history
      },
    });

    res.json({
      vehicle: await withPhotoUrl(vehicle),
      archived: true,
      message: 'Vehicle archived. Existing share links and history remain available.',
    });
  } catch (err) {
    console.error('delete vehicle failed:', err);
    res.status(500).json({ error: err.message || 'Failed to remove vehicle' });
  }
});

router.get('/:id/photo', async (req, res) => {
  const vehicle = await getOwnedVehicle(req.params.id, req.user.id, { includeArchived: true });
  if (!vehicle?.photoPath) return res.status(404).json({ error: 'Photo not found' });
  try {
    const buffer = await readUploadBuffer(BUCKETS.vehicles, vehicle.photoPath);
    const contentType = inferImageContentType(vehicle.photoPath, null);
    res.set('Cache-Control', 'private, max-age=3600');
    res.type(contentType);
    return res.send(buffer);
  } catch (err) {
    console.error('vehicle photo read failed:', err.message);
    return res.status(404).json({ error: 'Photo not found' });
  }
});

export default router;

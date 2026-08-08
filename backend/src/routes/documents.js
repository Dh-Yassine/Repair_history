import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { memoryUpload } from '../lib/upload.js';
import { BUCKETS, deleteUpload, documentKey, resolveFileUrl, saveUpload } from '../lib/storage.js';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

const upload = memoryUpload({
  maxSize: 10 * 1024 * 1024,
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, JPEG, and PNG files are allowed'));
  },
});

const router = Router({ mergeParams: true });
router.use(requireAuth);

async function getOwnedEvent(vehicleId, eventId, ownerId) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, ownerId } });
  if (!vehicle) return null;
  return prisma.maintenanceEvent.findFirst({
    where: { id: eventId, vehicleId: vehicle.id },
  });
}

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload rejected' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const event = await getOwnedEvent(req.params.vehicleId, req.params.eventId, req.user.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (!req.file.buffer?.length) {
      return res.status(400).json({ error: 'Upload file is empty' });
    }

    const key = documentKey(req.file.originalname);
    await saveUpload(BUCKETS.documents, key, req.file.buffer, req.file.mimetype);

    const document = await prisma.document.create({
      data: {
        eventId: event.id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        filePath: key,
      },
    });

    res.status(201).json({ document });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

router.get('/:documentId/file', async (req, res) => {
  const event = await getOwnedEvent(req.params.vehicleId, req.params.eventId, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const document = await prisma.document.findFirst({
    where: { id: req.params.documentId, eventId: event.id },
  });
  if (!document) return res.status(404).json({ error: 'Document not found' });

  const url = await resolveFileUrl(BUCKETS.documents, document.filePath);
  res.redirect(url);
});

router.delete('/:documentId', async (req, res) => {
  const event = await getOwnedEvent(req.params.vehicleId, req.params.eventId, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const document = await prisma.document.findFirst({
    where: { id: req.params.documentId, eventId: event.id },
  });
  if (!document) return res.status(404).json({ error: 'Document not found' });

  await deleteUpload(BUCKETS.documents, document.filePath);
  await prisma.document.delete({ where: { id: document.id } });
  res.status(204).send();
});

export default router;

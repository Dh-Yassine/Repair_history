import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { generateRemindersFromEvents } from '../lib/reminders.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const ownerRouter = Router();
ownerRouter.use(requireAuth);
ownerRouter.use(requireRole('OWNER'));

ownerRouter.get('/', async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId: req.user.id },
    select: { id: true },
  });
  const reminders = await prisma.serviceReminder.findMany({
    where: { vehicleId: { in: vehicles.map((v) => v.id) }, completed: false },
    orderBy: { dueDate: 'asc' },
    include: {
      vehicle: { select: { make: true, model: true, year: true } },
      shop: { select: { shopName: true } },
    },
  });
  res.json({ reminders });
});

ownerRouter.get('/vehicle/:vehicleId', async (req, res) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: req.params.vehicleId, ownerId: req.user.id },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const reminders = await prisma.serviceReminder.findMany({
    where: { vehicleId: vehicle.id, completed: false },
    orderBy: { dueDate: 'asc' },
  });
  res.json({ reminders });
});

ownerRouter.post('/vehicle/:vehicleId/generate', async (req, res) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: req.params.vehicleId, ownerId: req.user.id },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const created = await generateRemindersFromEvents(vehicle.id);
  res.status(201).json({ created });
});

ownerRouter.post('/vehicle/:vehicleId', async (req, res) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: req.params.vehicleId, ownerId: req.user.id },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const { serviceType, dueDate, dueMileage, message } = req.body;
  if (!serviceType?.trim()) return res.status(400).json({ error: 'serviceType is required' });

  const reminder = await prisma.serviceReminder.create({
    data: {
      vehicleId: vehicle.id,
      serviceType: serviceType.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      dueMileage: dueMileage !== undefined ? parseFloat(dueMileage) : null,
      message: message?.trim() || null,
    },
  });
  res.status(201).json({ reminder });
});

ownerRouter.patch('/:id/complete', async (req, res) => {
  const reminder = await prisma.serviceReminder.findFirst({
    where: { id: req.params.id, vehicle: { ownerId: req.user.id } },
  });
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

  const updated = await prisma.serviceReminder.update({
    where: { id: reminder.id },
    data: { completed: true },
  });
  res.json({ reminder: updated });
});

export { ownerRouter };

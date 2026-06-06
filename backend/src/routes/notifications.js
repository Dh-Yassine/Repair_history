import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: req.user.id, read: false },
  });
  res.json({ notifications, unreadCount });
});

router.patch('/:id/read', async (req, res) => {
  const n = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!n) return res.status(404).json({ error: 'Notification not found' });

  const notification = await prisma.notification.update({
    where: { id: n.id },
    data: { read: true },
  });
  res.json({ notification });
});

router.post('/read-all', async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, read: false },
    data: { read: true },
  });
  res.json({ ok: true });
});

export default router;

import { Router } from 'express';
import { processDueReminders } from '../lib/reminders.js';

const router = Router();

router.get('/reminders', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  if (secret && auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sent = await processDueReminders();
    res.json({ ok: true, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Cron failed' });
  }
});

export default router;

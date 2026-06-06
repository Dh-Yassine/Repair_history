import app from './app.js';
import { seedIfEmpty } from './lib/seed.js';
import { processDueReminders } from './lib/reminders.js';

const PORT = process.env.PORT || 3001;
const REMINDER_INTERVAL_MS = 60 * 60 * 1000;

if (!process.env.VERCEL && !process.env.NETLIFY) {
  app.listen(PORT, async () => {
    console.log(`AutoHistory API running on http://localhost:${PORT}`);
    try {
      await seedIfEmpty();
    } catch (err) {
      console.error('Seed failed:', err.message);
    }
    processDueReminders().then((n) => console.log(`Reminder check: ${n} notifications sent`));
    setInterval(() => {
      processDueReminders().catch(console.error);
    }, REMINDER_INTERVAL_MS);
  });
}

export default app;

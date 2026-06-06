import { processDueReminders } from '../../backend/src/lib/reminders.js';

export async function handler(event) {
  const secret = process.env.CRON_SECRET;
  const auth = event.headers?.authorization || event.headers?.Authorization;

  if (secret && auth !== `Bearer ${secret}`) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const sent = await processDueReminders();
    return { statusCode: 200, body: JSON.stringify({ ok: true, sent }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Cron failed' }) };
  }
}

export const config = {
  schedule: '@hourly',
};

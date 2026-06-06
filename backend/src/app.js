import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import eventRoutes from './routes/events.js';
import documentRoutes from './routes/documents.js';
import vinRoutes from './routes/vin.js';
import shopRoutes from './routes/shop.js';
import notificationRoutes from './routes/notifications.js';
import publicRoutes from './routes/public.js';
import shareRoutes from './routes/share.js';
import analyticsRoutes from './routes/analytics.js';
import { ownerRouter as reminderRoutes } from './routes/reminders.js';
import suggestionRoutes from './routes/suggestions.js';
import partnersRoutes from './routes/partners.js';
import marketplaceRoutes from './routes/marketplace.js';
import insuranceRoutes from './routes/insurance.js';
import adminRoutes from './routes/admin.js';
import cronRoutes from './routes/cron.js';
import { isSupabaseConfigured } from './lib/supabase.js';
import { backendRoot } from './lib/paths.js';

const rootDir = backendRoot(import.meta.url);

const app = express();
const isServerless = Boolean(process.env.VERCEL || process.env.NETLIFY);
const uploadDir = process.env.UPLOAD_DIR || path.join(rootDir, 'uploads');

const corsOrigin = process.env.APP_BASE_URL || process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json());

if (!isServerless) {
  app.use('/badge', express.static(path.join(rootDir, 'public')));
  if (!isSupabaseConfigured()) {
    app.use('/uploads/vehicles', express.static(path.join(uploadDir, 'vehicles')));
    app.use('/uploads', express.static(uploadDir));
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AutoHistory API',
    storage: isSupabaseConfigured() ? 'supabase' : 'local',
    auth: isSupabaseConfigured() ? 'supabase' : 'jwt',
  });
});

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/vin', vinRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/vehicles/:vehicleId/share', shareRoutes);
app.use('/api/vehicles/:vehicleId/suggestions', suggestionRoutes);
app.use('/api/vehicles/:vehicleId/events', eventRoutes);
app.use('/api/vehicles/:vehicleId/events/:eventId/documents', documentRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;

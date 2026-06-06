import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { isSupabaseConfigured, verifySupabaseToken } from '../lib/supabase.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);

  if (isSupabaseConfigured()) {
    try {
      const authUser = await verifySupabaseToken(token);
      if (!authUser) return res.status(401).json({ error: 'Invalid or expired token' });

      const profile = await prisma.user.findUnique({ where: { id: authUser.id } });
      if (!profile) {
        return res.status(401).json({ error: 'Profile not found. Complete registration.' });
      }
      if (profile.banned) {
        return res.status(403).json({ error: 'Account suspended. Contact support.' });
      }

      req.user = { id: profile.id, email: profile.email, role: profile.role };
      req.authProvider = 'supabase';
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    req.authProvider = 'jwt';
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Auth via Supabase token only — used when creating profile after sign-up */
export async function requireSupabaseUser(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Supabase Auth is not configured' });
  }

  try {
    const token = header.slice(7);
    const authUser = await verifySupabaseToken(token);
    if (!authUser) return res.status(401).json({ error: 'Invalid or expired token' });
    req.authUser = authUser;
    next();
  } catch (err) {
    console.error('[requireSupabaseUser] unexpected error:', err);
    res.status(500).json({ error: 'Auth verification failed: ' + (err?.message || String(err)) });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

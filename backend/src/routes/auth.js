import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireSupabaseUser } from '../middleware/auth.js';
import { isSupabaseConfigured } from '../lib/supabase.js';

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

router.post('/register/shop', async (req, res) => {
  if (isSupabaseConfigured()) {
    return res.status(400).json({ error: 'Use the app sign-up form (Supabase Auth is enabled).' });
  }
  try {
    const { fullName, email, password, phone, shopName, address } = req.body;
    if (!fullName?.trim() || !email?.trim() || !password || !shopName?.trim()) {
      return res.status(400).json({ error: 'fullName, email, password, and shopName are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        passwordHash,
        role: 'SHOP',
        shopName: shopName.trim(),
        address: address?.trim() || null,
        shopVerified: true,
      },
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Shop registration failed' });
  }
});

router.post('/register/buyer', async (req, res) => {
  if (isSupabaseConfigured()) {
    return res.status(400).json({ error: 'Use the app sign-up form (Supabase Auth is enabled).' });
  }
  try {
    const { fullName, email, password, phone } = req.body;
    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'fullName, email, and password are required' });
    }
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        passwordHash,
        role: 'BUYER',
      },
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/register', async (req, res) => {
  if (isSupabaseConfigured()) {
    return res.status(400).json({ error: 'Use the app sign-up form (Supabase Auth is enabled).' });
  }
  try {
    const { fullName, email, password, phone } = req.body;
    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'fullName, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        passwordHash,
        role: 'OWNER',
      },
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  if (isSupabaseConfigured()) {
    return res.status(400).json({ error: 'Use the app sign-in form (Supabase Auth is enabled).' });
  }
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.banned) {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** Create app profile after Supabase Auth sign-up (id matches auth.users.id) */
router.post('/sync-profile', requireSupabaseUser, async (req, res) => {
  try {
    const { fullName, role, phone, shopName, address } = req.body;
    const authUser = req.authUser;

    const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (existing) {
      return res.json({ user: publicUser(existing) });
    }

    const email = authUser.email?.toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email required from auth provider' });

    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return res.status(409).json({ error: 'Email already registered with a different account' });
    }

    const userRole = role === 'SHOP' ? 'SHOP' : role === 'BUYER' ? 'BUYER' : 'OWNER';
    if (userRole === 'SHOP' && !shopName?.trim()) {
      return res.status(400).json({ error: 'shopName is required for shop accounts' });
    }

    const user = await prisma.user.create({
      data: {
        id: authUser.id,
        fullName: (fullName || authUser.user_metadata?.full_name || email.split('@')[0]).trim(),
        email,
        phone: phone?.trim() || null,
        role: userRole,
        shopName: userRole === 'SHOP' ? shopName.trim() : null,
        address: userRole === 'SHOP' ? address?.trim() || null : null,
        shopVerified: userRole === 'SHOP',
      },
    });

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile sync failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(fullName !== undefined && { fullName: fullName.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
    });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

export default router;

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireSupabaseUser } from '../middleware/auth.js';
import { isSupabaseConfigured, supabaseAuthUserExists } from '../lib/supabase.js';
import { validatePassword } from '../lib/passwordPolicy.js';

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
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
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
        shopVerified: false,
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
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
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
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
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
    const meta = authUser.user_metadata ?? {};

    const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (existing) {
      return res.json({ user: publicUser(existing) });
    }

    const email = authUser.email?.toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email required from auth provider' });

    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken && emailTaken.id !== authUser.id) {
      const authStillExists = await supabaseAuthUserExists(emailTaken.id);
      if (authStillExists) {
        return res.status(409).json({ error: 'Email already registered with a different account' });
      }
      // Supabase auth was deleted but app profile remained — allow re-signup
      await prisma.user.delete({ where: { id: emailTaken.id } });
    }

    const resolvedRole = role || meta.role;
    const userRole = resolvedRole === 'SHOP' ? 'SHOP' : resolvedRole === 'BUYER' ? 'BUYER' : 'OWNER';
    const resolvedShopName = shopName?.trim() || meta.shop_name || meta.shopName || null;
    if (userRole === 'SHOP' && !resolvedShopName) {
      return res.status(400).json({ error: 'shopName is required for shop accounts' });
    }

    const user = await prisma.user.create({
      data: {
        id: authUser.id,
        fullName: String(fullName || meta.full_name || meta.fullName || email.split('@')[0] || 'User').trim(),
        email,
        phone: phone ? String(phone).trim() || null : meta.phone ? String(meta.phone).trim() || null : null,
        role: userRole,
        shopName: userRole === 'SHOP' ? resolvedShopName : null,
        address: userRole === 'SHOP' ? (address ? String(address).trim() : meta.address ? String(meta.address).trim() : null) : null,
        shopVerified: false,
      },
    });

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    console.error('sync-profile failed:', err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered with a different account' });
    }
    res.status(500).json({
      error: err.message || 'Profile sync failed',
      code: err.code || null,
      meta: err.meta || null,
    });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { fullName, phone, shopName, address, emailNotifications, inAppNotifications } = req.body;
    if (fullName !== undefined && !String(fullName).trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    const isShop = req.user.role === 'SHOP';
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(fullName !== undefined && { fullName: String(fullName).trim() }),
        ...(phone !== undefined && { phone: String(phone).trim() || null }),
        ...(isShop && shopName !== undefined && String(shopName).trim()
          ? { shopName: String(shopName).trim() }
          : {}),
        ...(isShop && address !== undefined && { address: String(address).trim() || null }),
        ...(emailNotifications !== undefined && { emailNotifications: Boolean(emailNotifications) }),
        ...(inAppNotifications !== undefined && { inAppNotifications: Boolean(inAppNotifications) }),
      },
    });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

/**
 * Password change for local JWT mode. With Supabase Auth enabled the client
 * calls supabase.auth.updateUser({ password }) directly instead.
 */
router.post('/change-password', requireAuth, async (req, res) => {
  if (isSupabaseConfigured()) {
    return res.status(400).json({ error: 'Password changes are handled by the sign-in provider.' });
  }
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Password change failed' });
  }
});

/**
 * Account deletion.
 * If the user has any vehicle with an active/ever share link OR any shop-verified
 * event, anonymize PII instead of hard-deleting so buyer share links keep working.
 */
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.deletedAt) {
      return res.status(400).json({ error: 'This account has already been deleted.' });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        shareToken: true,
        shareEverEnabled: true,
        events: { select: { verified: true }, where: { verified: true }, take: 1 },
      },
    });

    const hasProtectedHistory = vehicles.some(
      (v) => v.shareToken || v.shareEverEnabled || v.events.length > 0
    );

    // Also protect if this user (as a shop) created verified events still on other vehicles
    const shopVerifiedCount = await prisma.maintenanceEvent.count({
      where: { createdByShopId: userId, verified: true },
    });
    const shopVerificationCount = await prisma.verification.count({
      where: { shopId: userId },
    });

    const mustAnonymize =
      hasProtectedHistory || shopVerifiedCount > 0 || shopVerificationCount > 0;

    if (mustAnonymize) {
      const anonymized = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: 'Deleted User',
          email: `deleted+${userId}@deleted.autohistory.local`,
          phone: null,
          passwordHash: null,
          shopName: user.role === 'SHOP' ? 'Former shop' : null,
          address: null,
          banned: true,
          deletedAt: new Date(),
        },
      });

      // Best-effort: remove Supabase auth user so the email can be reused
      try {
        const { getSupabaseAdmin, isSupabaseConfigured } = await import('../lib/supabase.js');
        if (isSupabaseConfigured()) {
          const admin = getSupabaseAdmin();
          await admin?.auth.admin.deleteUser(userId);
        }
      } catch (authErr) {
        console.warn('Supabase auth delete after anonymize failed:', authErr.message);
      }

      return res.json({
        anonymized: true,
        message:
          'Account anonymized. Shared vehicle histories remain available to buyers who already have the link.',
        user: publicUser(anonymized),
      });
    }

    await prisma.user.delete({ where: { id: userId } });

    try {
      const { getSupabaseAdmin, isSupabaseConfigured } = await import('../lib/supabase.js');
      if (isSupabaseConfigured()) {
        const admin = getSupabaseAdmin();
        await admin?.auth.admin.deleteUser(userId);
      }
    } catch (authErr) {
      console.warn('Supabase auth delete after hard delete failed:', authErr.message);
    }

    res.status(204).send();
  } catch (err) {
    console.error('account delete failed:', err);
    res.status(500).json({ error: err.message || 'Account deletion failed' });
  }
});

export default router;

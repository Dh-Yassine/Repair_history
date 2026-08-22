import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { isSupabaseConfigured, getSupabaseAdmin } from './supabase.js';

export async function seedIfEmpty() {
  if (!prisma.sparePart || !prisma.featuredShopAd || !prisma.badgeEvent) {
    console.warn(
      'Prisma client is out of date (Phase 5 models missing). Stop the server, run: npx prisma generate'
    );
    return;
  }

  const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminExists) {
    await seedAdmin();
  }

  const partsCount = await prisma.sparePart.count();
  if (partsCount === 0) {
    await prisma.sparePart.createMany({
      data: [
        { partName: 'Synthetic Motor Oil 5W-30 (5qt)', price: 34.99, supplier: 'AutoZone', buyUrl: 'https://www.autozone.com', category: 'oil', make: 'Toyota', model: 'Camry', yearMin: 2015, yearMax: 2024 },
        { partName: 'Ceramic Brake Pad Set (Front)', price: 89.5, supplier: 'RockAuto', buyUrl: 'https://www.rockauto.com', category: 'brakes', make: 'Toyota', model: 'Camry', yearMin: 2012, yearMax: 2024 },
        { partName: 'All-Season Tire 215/55R17', price: 129.0, supplier: 'Tire Rack', buyUrl: 'https://www.tirerack.com', category: 'tires' },
        { partName: 'Engine Air Filter', price: 18.99, supplier: 'Amazon Automotive', buyUrl: 'https://www.amazon.com', category: 'filters', make: 'Honda', model: 'Civic', yearMin: 2016, yearMax: 2024 },
        { partName: '12V AGM Battery', price: 189.0, supplier: 'Interstate', buyUrl: 'https://www.interstatebatteries.com', category: 'battery' },
        { partName: 'Cabin Air Filter', price: 14.5, supplier: 'FRAM', buyUrl: 'https://www.fram.com', category: 'filters' },
        { partName: 'Spark Plug Set (4)', price: 32.0, supplier: 'NGK', buyUrl: 'https://www.ngksparkplugs.com', category: 'engine' },
        { partName: 'Wiper Blade Pair 26"/17"', price: 24.99, supplier: 'Bosch', buyUrl: 'https://www.boschautoparts.com', category: 'accessories' },
      ],
    });
    console.log('Seeded spare parts catalog');
  }

  await removeDemoFeaturedShops();
}

const DEFAULT_ADMIN_EMAIL = 'admin@autohistory.local';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

/**
 * The login form only ever calls Supabase's `signInWithPassword` once Supabase Auth
 * is configured — it never falls back to the local bcrypt check. A local-only admin
 * row would exist in Postgres but could never actually sign in, so the seed has to
 * create the admin the same way any other account gets created in that mode.
 */
async function seedAdmin() {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Platform Admin', role: 'ADMIN' },
    });
    if (error) {
      console.warn('Could not seed Supabase admin user:', error.message);
      return;
    }
    await prisma.user.create({
      data: {
        id: data.user.id,
        fullName: 'Platform Admin',
        email: DEFAULT_ADMIN_EMAIL,
        role: 'ADMIN',
      },
    });
    console.log(`Seeded admin (Supabase Auth): ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
    return;
  }

  const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: {
      fullName: 'Platform Admin',
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash: hash,
      role: 'ADMIN',
    },
  });
  console.log(`Seeded admin: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
}

/** Remove US demo workshops seeded in early versions (wrong locale / fake addresses). */
async function removeDemoFeaturedShops() {
  const demoEmails = ['premier@autohistory.local', 'quickfix@autohistory.local'];
  const demoShops = await prisma.user.findMany({
    where: { email: { in: demoEmails } },
    select: { id: true },
  });
  if (demoShops.length === 0) return;
  const ids = demoShops.map((s) => s.id);
  const { count } = await prisma.featuredShopAd.deleteMany({ where: { shopId: { in: ids } } });
  if (count > 0) console.log(`Removed ${count} demo featured shop ad(s)`);
}

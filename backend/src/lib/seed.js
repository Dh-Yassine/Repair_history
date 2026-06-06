import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

export async function seedIfEmpty() {
  if (!prisma.sparePart || !prisma.featuredShopAd || !prisma.badgeEvent) {
    console.warn(
      'Prisma client is out of date (Phase 5 models missing). Stop the server, run: npx prisma generate'
    );
    return;
  }

  const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        fullName: 'Platform Admin',
        email: 'admin@autohistory.local',
        passwordHash: hash,
        role: 'ADMIN',
      },
    });
    console.log('Seeded admin: admin@autohistory.local / admin123');
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

  const adsCount = await prisma.featuredShopAd.count();
  if (adsCount === 0) {
    let shops = await prisma.user.findMany({ where: { role: 'SHOP' }, take: 3 });
    if (shops.length === 0) {
      const hash = await bcrypt.hash('shop123', 10);
      const s1 = await prisma.user.create({
        data: { fullName: 'Mike Chen', email: 'premier@autohistory.local', passwordHash: hash, role: 'SHOP', shopName: 'Premier Auto Care', address: '123 Main St', shopVerified: true },
      });
      const s2 = await prisma.user.create({
        data: { fullName: 'Sarah Lopez', email: 'quickfix@autohistory.local', passwordHash: hash, role: 'SHOP', shopName: 'QuickFix Garage', address: '456 Oak Ave', shopVerified: true },
      });
      shops = [s1, s2];
    }
    const now = new Date();
    const in90 = new Date(now);
    in90.setDate(in90.getDate() + 90);
    for (let i = 0; i < shops.length; i++) {
      await prisma.featuredShopAd.create({
        data: {
          shopId: shops[i].id,
          ctaButton: i === 0 ? 'Book Now' : 'Get Quote',
          startDate: now,
          endDate: in90,
          active: true,
          priority: shops.length - i,
        },
      });
    }
    console.log('Seeded featured shop ads');
  }
}

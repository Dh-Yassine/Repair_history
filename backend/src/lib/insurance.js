import { prisma } from './prisma.js';

export async function getAnonymizedReliabilityData() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      events: { select: { verified: true, eventType: true, cost: true, date: true, mileage: true } },
    },
  });

  const byMake = {};
  let totalEvents = 0;
  let verifiedEvents = 0;
  const eventTypes = {};

  for (const v of vehicles) {
    const key = v.make;
    if (!byMake[key]) {
      byMake[key] = { make: key, vehicleCount: 0, eventCount: 0, verifiedCount: 0, avgMileage: 0, mileageSum: 0 };
    }
    byMake[key].vehicleCount++;
    byMake[key].mileageSum += v.mileage;

    for (const e of v.events) {
      totalEvents++;
      if (e.verified) verifiedEvents++;
      byMake[key].eventCount++;
      if (e.verified) byMake[key].verifiedCount++;
      eventTypes[e.eventType] = (eventTypes[e.eventType] || 0) + 1;
    }
  }

  const makeStats = Object.values(byMake).map((m) => ({
    make: m.make,
    vehicleCount: m.vehicleCount,
    avgEventsPerVehicle: m.vehicleCount ? Math.round((m.eventCount / m.vehicleCount) * 10) / 10 : 0,
    verificationRate: m.eventCount ? Math.round((m.verifiedCount / m.eventCount) * 100) : 0,
    avgMileage: m.vehicleCount ? Math.round(m.mileageSum / m.vehicleCount) : 0,
  }));

  const currentYear = new Date().getFullYear();
  const ageBuckets = { '0-3': 0, '4-7': 0, '8-12': 0, '13+': 0 };
  for (const v of vehicles) {
    const age = currentYear - v.year;
    if (age <= 3) ageBuckets['0-3']++;
    else if (age <= 7) ageBuckets['4-7']++;
    else if (age <= 12) ageBuckets['8-12']++;
    else ageBuckets['13+']++;
  }

  return {
    generatedAt: new Date().toISOString(),
    fleetSize: vehicles.length,
    totalMaintenanceEvents: totalEvents,
    platformVerificationRate: totalEvents ? Math.round((verifiedEvents / totalEvents) * 100) : 0,
    eventsByType: eventTypes,
    byManufacturer: makeStats,
    fleetAgeDistribution: ageBuckets,
    disclaimer: 'Anonymized aggregate data only. No VINs, owner PII, or document content included.',
  };
}

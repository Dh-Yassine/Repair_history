const SERVICE_RULES = {
  'Oil change': { months: 6, km: 8000 },
  'Tire rotation': { months: 6, km: 10000 },
  'Brake service': { months: 24, km: 40000 },
};

export function computeOwnerAnalytics(vehicles) {
  const allEvents = vehicles.flatMap((v) =>
    v.events.map((e) => ({ ...e, vehicleLabel: `${v.year} ${v.make} ${v.model}` }))
  );

  const costs = allEvents.filter((e) => e.cost != null).map((e) => e.cost);
  const averageServiceCost =
    costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;

  const byType = {};
  for (const e of allEvents) {
    byType[e.eventType] = (byType[e.eventType] || 0) + 1;
  }

  const serviceFrequency = allEvents.length;
  const verifiedCount = allEvents.filter((e) => e.verified).length;
  const shopVerifiedCount = allEvents.filter((e) => e.source === 'SHOP' && e.verified).length;
  const selfReportedCount = allEvents.filter((e) => e.source !== 'SHOP').length;
  const conversionRate = serviceFrequency > 0 ? verifiedCount / serviceFrequency : 0;

  const upcoming = [];
  for (const vehicle of vehicles) {
    for (const [serviceType, rule] of Object.entries(SERVICE_RULES)) {
      const last = vehicle.events.find((e) => e.eventType === serviceType);
      if (!last) continue;
      const dueDate = new Date(last.date);
      dueDate.setMonth(dueDate.getMonth() + rule.months);
      if (dueDate > new Date()) {
        upcoming.push({
          vehicleId: vehicle.id,
          vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          serviceType,
          dueDate: dueDate.toISOString().slice(0, 10),
          dueMileage: last.mileage + rule.km,
        });
      }
    }
  }

  const costByMonth = {};
  for (const e of allEvents) {
    if (e.cost == null) continue;
    const key = e.date.toISOString().slice(0, 7);
    costByMonth[key] = (costByMonth[key] || 0) + e.cost;
  }

  return {
    averageServiceCost: Math.round(averageServiceCost * 100) / 100,
    serviceFrequency,
    conversionRate: Math.round(conversionRate * 100) / 100,
    verifiedCount,
    shopVerifiedCount,
    selfReportedCount,
    totalEvents: allEvents.length,
    vehicleCount: vehicles.length,
    eventsByType: byType,
    costByMonth,
    upcomingNeeds: upcoming.slice(0, 10),
    recentEvents: allEvents
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map((e) => ({
        eventType: e.eventType,
        date: e.date,
        cost: e.cost,
        verified: e.verified,
        source: e.source,
        vehicleLabel: e.vehicleLabel,
      })),
  };
}

export function computeShopAnalytics(shopId, verifications, pendingCount) {
  const last30 = verifications.filter(
    (v) => Date.now() - new Date(v.verifiedAt).getTime() < 30 * 24 * 60 * 60 * 1000
  );

  return {
    totalVerifications: verifications.length,
    verificationsLast30Days: last30.length,
    pendingEvents: pendingCount,
    serviceFrequency: verifications.length,
    conversionRate: verifications.length > 0 ? 1 : 0,
    recentVerifications: verifications.slice(0, 8).map((v) => ({
      eventType: v.event.eventType,
      verifiedAt: v.verifiedAt,
      vehicle: `${v.event.vehicle.year} ${v.event.vehicle.make} ${v.event.vehicle.model}`,
    })),
  };
}

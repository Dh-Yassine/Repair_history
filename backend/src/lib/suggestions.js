const SERVICE_RULES = {
  'Oil change': { months: 6, km: 8000 },
  'Tire rotation': { months: 6, km: 10000 },
  'Brake service': { months: 24, km: 40000 },
  'Battery replacement': { months: 36, km: 60000 },
  Inspection: { months: 12, km: 20000 },
};

export function getMaintenanceSuggestions(vehicle, events) {
  const suggestions = [];
  const now = new Date();
  const currentMileage = vehicle.mileage;

  for (const [serviceType, rule] of Object.entries(SERVICE_RULES)) {
    const last = events.find((e) => e.eventType === serviceType);
    if (!last) {
      suggestions.push({
        serviceType,
        reasonKey: 'neverLogged',
        reasonParams: {},
        priority: 'medium',
      });
      continue;
    }

    const monthsSince =
      (now.getTime() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    const kmSince = currentMileage - last.mileage;

    if (monthsSince >= rule.months * 0.9) {
      suggestions.push({
        serviceType,
        reasonKey: 'overdueTime',
        reasonParams: { months: Math.round(monthsSince), interval: rule.months },
        priority: monthsSince >= rule.months ? 'high' : 'medium',
        suggestedDueDate: addMonths(new Date(last.date), rule.months).toISOString().slice(0, 10),
      });
    } else if (kmSince >= rule.km * 0.9) {
      suggestions.push({
        serviceType,
        reasonKey: 'overdueMileage',
        reasonParams: { km: Math.round(kmSince), interval: rule.km },
        priority: kmSince >= rule.km ? 'high' : 'medium',
        suggestedDueMileage: last.mileage + rule.km,
      });
    }
  }

  const verifiedRatio = events.length ? events.filter((e) => e.verified).length / events.length : 0;
  if (events.length >= 2 && verifiedRatio < 0.5) {
    suggestions.push({
      serviceType: 'Verification',
      reasonKey: 'lowVerification',
      reasonParams: {},
      priority: 'low',
    });
  }

  return suggestions.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

function priorityRank(p) {
  return { high: 0, medium: 1, low: 2 }[p] ?? 2;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

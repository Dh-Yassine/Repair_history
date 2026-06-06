import { prisma } from './prisma.js';
import { notifyUser } from './notify.js';
import { sendEmail } from './email.js';

const DEFAULT_INTERVALS = {
  'Oil change': { months: 6, km: 8000 },
  'Tire rotation': { months: 6, km: 10000 },
  'Brake service': { months: 24, km: 40000 },
  Inspection: { months: 12, km: 20000 },
};

export async function generateRemindersFromEvents(vehicleId) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { events: { orderBy: { date: 'desc' } }, reminders: { where: { completed: false } } },
  });
  if (!vehicle) return [];

  const created = [];
  for (const [serviceType, rule] of Object.entries(DEFAULT_INTERVALS)) {
    const exists = vehicle.reminders.some((r) => r.serviceType === serviceType && !r.completed);
    if (exists) continue;

    const last = vehicle.events.find((e) => e.eventType === serviceType);
    if (!last) continue;

    const dueDate = new Date(last.date);
    dueDate.setMonth(dueDate.getMonth() + rule.months);
    const dueMileage = last.mileage + rule.km;

    const reminder = await prisma.serviceReminder.create({
      data: {
        vehicleId,
        serviceType,
        dueDate,
        dueMileage,
        message: `Based on your last ${serviceType.toLowerCase()}.`,
      },
    });
    created.push(reminder);
  }
  return created;
}

export async function processDueReminders() {
  const now = new Date();
  const reminders = await prisma.serviceReminder.findMany({
    where: { completed: false, notified: false },
    include: { vehicle: { include: { owner: true } } },
  });

  let sent = 0;
  for (const r of reminders) {
    const dueByDate = r.dueDate && r.dueDate <= now;
    const dueByMileage = r.dueMileage != null && r.vehicle.mileage >= r.dueMileage;
    if (!dueByDate && !dueByMileage) continue;

    const label = `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`;
    const msg = `${r.serviceType} due for ${label}${r.message ? ` — ${r.message}` : ''}`;

    await notifyUser(r.vehicle.ownerId, msg, 'reminder');
    await sendEmail(
      r.vehicle.owner.email,
      `AutoHistory: ${r.serviceType} reminder`,
      `${msg}\n\nLog in to AutoHistory to schedule service.`
    );

    await prisma.serviceReminder.update({
      where: { id: r.id },
      data: { notified: true },
    });
    sent++;
  }
  return sent;
}

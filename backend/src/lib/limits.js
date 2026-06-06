import { prisma } from './prisma.js';

export async function getVehicleLimits(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const count = await prisma.vehicle.count({ where: { ownerId: userId } });
  const max = user?.maxVehicles ?? 3;
  const isPaid = user?.subscriptionType !== 'free';
  return {
    count,
    max,
    canAdd: isPaid || count < max,
    subscriptionType: user?.subscriptionType ?? 'free',
  };
}

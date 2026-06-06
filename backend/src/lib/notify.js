import { prisma } from './prisma.js';

export async function notifyUser(userId, message, type = 'info') {
  return prisma.notification.create({
    data: { userId, message, type },
  });
}

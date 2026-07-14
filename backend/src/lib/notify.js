import { prisma } from './prisma.js';
import { sendEmail } from './email.js';

export async function notifyUser(userId, message, type = 'info') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inAppNotifications: true },
  });
  if (user && user.inAppNotifications === false) return null;
  return prisma.notification.create({
    data: { userId, message, type },
  });
}

/** Email a user only if they haven't turned off email notifications. */
export async function emailUser(userId, subject, text) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailNotifications: true, deletedAt: true },
  });
  if (!user || user.deletedAt || user.emailNotifications === false) return;
  await sendEmail(user.email, subject, text);
}

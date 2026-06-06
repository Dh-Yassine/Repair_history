import { PrismaClient } from '@prisma/client';

// Reuse the same instance across hot-reloads (local dev) and serverless invocations
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    errorFormat: 'minimal',
  });

globalForPrisma.__prisma = prisma;

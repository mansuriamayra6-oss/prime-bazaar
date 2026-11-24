import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  __pbPrismaClient?: PrismaClient;
};

export function isDatabaseConfigured(): boolean {
  const url = (process.env.DATABASE_URL || '').trim();
  return url.length > 0 && /^postgres(ql)?:\/\//i.test(url);
}

export function getPrismaClient(): PrismaClient | null {
  if (!isDatabaseConfigured()) {
    return null;
  }
  if (!globalForPrisma.__pbPrismaClient) {
    globalForPrisma.__pbPrismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  return globalForPrisma.__pbPrismaClient;
}

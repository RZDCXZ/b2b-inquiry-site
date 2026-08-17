import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/src/generated/prisma/client";

export type ApplicationDatabase = PrismaClient;

const globalPrisma = globalThis as typeof globalThis & {
  torquelisPrisma?: PrismaClient;
};

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

export function getApplicationPrisma(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to access application data.");
  }

  globalPrisma.torquelisPrisma ??= createPrismaClient(databaseUrl);
  return globalPrisma.torquelisPrisma;
}

export async function disconnectApplicationPrisma(): Promise<void> {
  const prisma = globalPrisma.torquelisPrisma;

  if (!prisma) {
    return;
  }

  delete globalPrisma.torquelisPrisma;
  await prisma.$disconnect();
}

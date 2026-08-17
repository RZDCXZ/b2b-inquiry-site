import "dotenv/config";

import { initializeDemoDataset } from "@/src/application/resettable-demo-dataset";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { ensurePresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the demo database.");
}

const prisma = createPrismaClient(databaseUrl);

try {
  const credentials = await ensurePresetCredentials();
  await initializeDemoDataset({ credentials, prisma });
  console.log(
    "Seeded the complete deterministic Torquelis local demo dataset.",
  );
} finally {
  await prisma.$disconnect();
}

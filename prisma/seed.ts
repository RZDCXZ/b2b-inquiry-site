import "dotenv/config";

import { seedDemoData } from "@/src/application/local-demo-data";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the demo database.");
}

const prisma = createPrismaClient(databaseUrl);

try {
  await seedDemoData(prisma);
  console.log(
    "Seeded the verified Torquelis local demo identity and site configuration.",
  );
} finally {
  await prisma.$disconnect();
}

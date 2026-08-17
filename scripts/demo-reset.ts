import "dotenv/config";

import path from "node:path";

import { resetDemoDataset } from "@/src/application/resettable-demo-dataset";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { assertLocalDemoTarget } from "@/src/infrastructure/local-demo/local-demo-target";
import { readPresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";
import { verifyLocalDatabaseIdentity } from "@/src/modules/site-config/server/verify-local-database";

const databaseUrl = process.env.DATABASE_URL ?? "";
assertLocalDemoTarget({
  databaseUrl,
  environmentMarker: process.env.DEMO_ENVIRONMENT_ID ?? "",
});

const prisma = createPrismaClient(databaseUrl);

try {
  const credentials = await readPresetCredentials();
  await verifyLocalDatabaseIdentity(prisma);
  await resetDemoDataset({ credentials, prisma });
  console.log(
    `Reset complete for the verified local demo. The fixed 50-product and 20-inquiry dataset was restored, and temporary uploads were cleared from ${path.join(process.cwd(), ".local", "uploads")}.`,
  );
} finally {
  await prisma.$disconnect();
}

import "dotenv/config";

import path from "node:path";

import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import {
  clearTemporaryUploads,
  regenerateDemoAssets,
} from "@/src/infrastructure/local-demo/generated-assets";
import { assertLocalDemoTarget } from "@/src/infrastructure/local-demo/local-demo-target";
import { replaceDemoData } from "@/src/modules/site-config/server/local-demo-data";
import { verifyLocalDatabaseIdentity } from "@/src/modules/site-config/server/verify-local-database";

const databaseUrl = process.env.DATABASE_URL ?? "";
assertLocalDemoTarget({
  databaseUrl,
  environmentMarker: process.env.DEMO_ENVIRONMENT_ID ?? "",
});

const prisma = createPrismaClient(databaseUrl);

try {
  await verifyLocalDatabaseIdentity(prisma);
  await replaceDemoData(prisma);
  await clearTemporaryUploads();
  await regenerateDemoAssets();
  console.log(
    `Reset complete for the verified local demo. Temporary uploads cleared from ${path.join(process.cwd(), ".local", "uploads")}.`,
  );
} finally {
  await prisma.$disconnect();
}

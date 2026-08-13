import "dotenv/config";

import path from "node:path";

import { replaceDemoData } from "@/src/application/local-demo-data";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { assertLocalDemoTarget } from "@/src/modules/site-config/public/local-demo-target";
import {
  clearTemporaryUploads,
  regenerateDemoAssets,
} from "@/src/modules/site-config/server/generated-assets";
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

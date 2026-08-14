import "dotenv/config";

import path from "node:path";

import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import {
  clearTemporaryUploads,
  regenerateDemoAssets,
} from "@/src/infrastructure/local-demo/generated-assets";
import { assertLocalDemoTarget } from "@/src/infrastructure/local-demo/local-demo-target";
import {
  replaceCatalogIdentities,
  seedCatalogProductLifecycleDemoData,
  seedProductReferenceDemoData,
} from "@/src/modules/catalog/server/catalog-demo-data";
import { seedSpecificationDemoData } from "@/src/modules/catalog/server/specification-demo-data";
import { replaceVehicleFitmentDemoData } from "@/src/modules/catalog/server/fitment-demo-data";
import { seedPublishedProductContent } from "@/src/modules/content-publishing/server/product-demo-content";
import { seedProductDraftDemoData } from "@/src/modules/content-publishing/server/product-draft-demo-data";
import { replacePresetAccounts } from "@/src/modules/identity-access/server/preset-accounts";
import { readPresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";
import { replaceInquiryAndNotificationData } from "@/src/application/inquiry-demo-reset";
import { replaceDemoData } from "@/src/modules/site-config/server/local-demo-data";
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
  await replaceDemoData(prisma);
  await replaceInquiryAndNotificationData(prisma);
  await replaceCatalogIdentities(prisma);
  await seedPublishedProductContent(prisma);
  await seedCatalogProductLifecycleDemoData(prisma);
  await seedProductReferenceDemoData(prisma);
  await seedSpecificationDemoData(prisma);
  await replaceVehicleFitmentDemoData(prisma);
  await seedProductDraftDemoData(prisma);
  await replacePresetAccounts(prisma, credentials);
  await clearTemporaryUploads();
  await regenerateDemoAssets();
  console.log(
    `Reset complete for the verified local demo. Temporary uploads cleared from ${path.join(process.cwd(), ".local", "uploads")}.`,
  );
} finally {
  await prisma.$disconnect();
}

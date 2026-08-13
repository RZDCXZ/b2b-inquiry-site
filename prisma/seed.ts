import "dotenv/config";

import { seedCatalogIdentities } from "@/src/modules/catalog/server/catalog-demo-data";
import { seedPublishedProductContent } from "@/src/modules/content-publishing/server/product-demo-content";
import { seedDemoData } from "@/src/modules/site-config/server/local-demo-data";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { seedPresetAccounts } from "@/src/modules/identity-access/server/preset-accounts";
import { ensurePresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the demo database.");
}

const prisma = createPrismaClient(databaseUrl);

try {
  const credentials = await ensurePresetCredentials();
  await seedDemoData(prisma);
  await seedCatalogIdentities(prisma);
  await seedPublishedProductContent(prisma);
  await seedPresetAccounts(prisma, credentials);
  console.log(
    "Seeded the verified Torquelis local demo identity, preset roles, and site configuration.",
  );
} finally {
  await prisma.$disconnect();
}

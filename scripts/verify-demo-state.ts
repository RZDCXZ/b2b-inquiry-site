import "dotenv/config";

import { stat } from "node:fs/promises";

import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { assertLocalDemoTarget } from "@/src/infrastructure/local-demo/local-demo-target";
import {
  DEFAULT_CREDENTIALS_PATH,
  readPresetCredentials,
} from "@/src/modules/identity-access/server/preset-credentials";
import { verifyLocalDatabaseIdentity } from "@/src/modules/site-config/server/verify-local-database";

const databaseUrl = process.env.DATABASE_URL ?? "";
assertLocalDemoTarget({
  databaseUrl,
  environmentMarker: process.env.DEMO_ENVIRONMENT_ID ?? "",
});

const authSecret = process.env.BETTER_AUTH_SECRET ?? "";
if (authSecret.length < 32 || authSecret === "generated-by-pnpm-setup") {
  throw new Error("The local authentication secret was not generated safely.");
}

const credentials = await readPresetCredentials();
const credentialMode = (await stat(DEFAULT_CREDENTIALS_PATH)).mode & 0o777;
const passwords = new Set(credentials.accounts.map(({ password }) => password));

if (credentialMode !== 0o600) {
  throw new Error("Local demo credentials must have file mode 0600.");
}
if (
  credentials.accounts.length !== 4 ||
  passwords.size !== credentials.accounts.length
) {
  throw new Error("Expected four independently generated local accounts.");
}

const prisma = createPrismaClient(databaseUrl);

try {
  await verifyLocalDatabaseIdentity(prisma);
  const [
    categories,
    products,
    vehicleMakes,
    vehicleModels,
    engines,
    fitments,
    articles,
    inquiries,
    quarantinedInquiries,
    users,
  ] = await Promise.all([
    prisma.productCategory.count(),
    prisma.product.count(),
    prisma.vehicleMake.count(),
    prisma.vehicleModel.count(),
    prisma.engine.count(),
    prisma.productFitment.count(),
    prisma.article.count(),
    prisma.inquiry.count(),
    prisma.quarantinedInquiry.count(),
    prisma.user.count(),
  ]);
  const actual = {
    articles,
    categories,
    engines,
    fitments,
    inquiries,
    products,
    quarantinedInquiries,
    users,
    vehicleMakes,
    vehicleModels,
  };
  const expected = {
    articles: 8,
    categories: 4,
    engines: 12,
    fitments: 150,
    inquiries: 18,
    products: 50,
    quarantinedInquiries: 2,
    users: 4,
    vehicleMakes: 6,
    vehicleModels: 12,
  };

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `The demo dataset does not match the reproducible baseline: ${JSON.stringify(actual)}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        credentialFileMode: "0600",
        dataset: actual,
        evidenceVersion: 1,
        localAccounts: credentials.accounts.length,
        randomizedCredentials: true,
        verifiedTarget: "loopback/torquelis_demo",
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}

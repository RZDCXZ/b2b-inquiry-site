import { stat } from "node:fs/promises";

import { z } from "zod";

import { disconnectApplicationPrisma } from "@/src/infrastructure/database/prisma";
import { assertLocalDemoTarget } from "@/src/infrastructure/local-demo/local-demo-target";
import { readCatalogDemoEvidence } from "@/src/modules/catalog/server/demo-evidence-query";
import { readContentDemoEvidence } from "@/src/modules/content-publishing/server/demo-evidence-query";
import { readIdentityDemoEvidence } from "@/src/modules/identity-access/server/demo-evidence-query";
import {
  DEFAULT_CREDENTIALS_PATH,
  readPresetCredentials,
} from "@/src/modules/identity-access/server/preset-credentials";
import { readInquiryDemoEvidence } from "@/src/modules/inquiry-operations/server/demo-evidence-query";
import { verifyLocalDatabaseIdentity } from "@/src/modules/site-config/server/verify-local-database";

const demoReproductionInputSchema = z.object({
  authSecret: z
    .string()
    .min(32, "The local authentication secret was not generated safely.")
    .refine((value) => value !== "generated-by-pnpm-setup", {
      error: "The local authentication secret was not generated safely.",
    }),
  databaseUrl: z.string().min(1),
  environmentMarker: z.string().min(1),
});

const expectedDatasetSchema = z.object({
  articles: z.literal(8),
  categories: z.literal(4),
  engines: z.literal(12),
  fitments: z.literal(150),
  inquiries: z.literal(18),
  products: z.literal(50),
  quarantinedInquiries: z.literal(2),
  users: z.literal(4),
  vehicleMakes: z.literal(6),
  vehicleModels: z.literal(12),
});

interface DemoReproductionInput {
  authSecret: string | undefined;
  databaseUrl: string | undefined;
  environmentMarker: string | undefined;
}

export async function verifyReproducibleDemoState(
  input: DemoReproductionInput,
) {
  const parsed = demoReproductionInputSchema.parse(input);
  assertLocalDemoTarget({
    databaseUrl: parsed.databaseUrl,
    environmentMarker: parsed.environmentMarker,
  });

  const credentials = await readPresetCredentials();
  const credentialMode = (await stat(DEFAULT_CREDENTIALS_PATH)).mode & 0o777;
  const passwords = new Set(
    credentials.accounts.map(({ password }) => password),
  );

  if (credentialMode !== 0o600) {
    throw new Error("Local demo credentials must have file mode 0600.");
  }
  if (
    credentials.accounts.length !== 4 ||
    passwords.size !== credentials.accounts.length
  ) {
    throw new Error("Expected four independently generated local accounts.");
  }

  try {
    await verifyLocalDatabaseIdentity();
    const [catalog, content, identity, inquiries] = await Promise.all([
      readCatalogDemoEvidence(),
      readContentDemoEvidence(),
      readIdentityDemoEvidence(),
      readInquiryDemoEvidence(),
    ]);
    const observedDataset = {
      ...catalog,
      ...content,
      ...identity,
      ...inquiries,
    };
    const dataset = expectedDatasetSchema.safeParse(observedDataset);

    if (!dataset.success) {
      throw new Error(
        `The demo dataset does not match the reproducible baseline: ${JSON.stringify(observedDataset)}`,
      );
    }

    return {
      credentialFileMode: "0600",
      dataset: dataset.data,
      evidenceVersion: 1,
      localAccounts: credentials.accounts.length,
      randomizedCredentials: true,
      verifiedTarget: "loopback/torquelis_demo",
    } as const;
  } finally {
    await disconnectApplicationPrisma();
  }
}

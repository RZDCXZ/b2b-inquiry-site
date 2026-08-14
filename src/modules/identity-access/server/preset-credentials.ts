import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import {
  APP_ROLES,
  ROLE_LABELS,
} from "@/src/modules/identity-access/public/permissions";

const presetAccountSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  password: z.string().min(20),
  role: z.enum([
    APP_ROLES.ADMINISTRATOR,
    APP_ROLES.CONTENT_EDITOR,
    APP_ROLES.SALES,
  ]),
  roleLabel: z.string().min(1),
});

const presetCredentialsSchema = z.object({
  accounts: z.array(presetAccountSchema).length(4),
  generatedAt: z.iso.datetime(),
  version: z.literal(2),
});

const legacyPresetCredentialsSchema = z.object({
  accounts: z.array(presetAccountSchema).length(3),
  generatedAt: z.iso.datetime(),
  version: z.literal(1),
});

export type PresetAccountCredential = z.infer<typeof presetAccountSchema>;
export type PresetCredentials = z.infer<typeof presetCredentialsSchema>;

export const DEFAULT_CREDENTIALS_PATH = path.join(
  process.cwd(),
  ".local",
  "demo-credentials.json",
);

const accountDefinitions = [
  {
    email: "administrator@torquelis.local",
    name: "陈屿",
    role: APP_ROLES.ADMINISTRATOR,
  },
  {
    email: "content-editor@torquelis.local",
    name: "王晴",
    role: APP_ROLES.CONTENT_EDITOR,
  },
  {
    email: "sales@torquelis.local",
    name: "林婧",
    role: APP_ROLES.SALES,
  },
  {
    email: "sales-secondary@torquelis.local",
    name: "周程",
    role: APP_ROLES.SALES,
  },
] as const;

function createPassword(): string {
  return randomBytes(24).toString("base64url");
}

function createPresetCredentials(): PresetCredentials {
  return {
    accounts: accountDefinitions.map((account) => ({
      ...account,
      password: createPassword(),
      roleLabel: ROLE_LABELS[account.role],
    })),
    generatedAt: new Date().toISOString(),
    version: 2,
  };
}

function migrateLegacyCredentials(
  legacy: z.infer<typeof legacyPresetCredentialsSchema>,
): PresetCredentials {
  const secondarySales = accountDefinitions[3];

  return {
    accounts: [
      ...legacy.accounts,
      {
        ...secondarySales,
        password: createPassword(),
        roleLabel: ROLE_LABELS[secondarySales.role],
      },
    ],
    generatedAt: legacy.generatedAt,
    version: 2,
  };
}

export async function readPresetCredentials(
  filePath = DEFAULT_CREDENTIALS_PATH,
): Promise<PresetCredentials> {
  const rawCredentials = await readFile(filePath, "utf8");
  return presetCredentialsSchema.parse(JSON.parse(rawCredentials));
}

export async function ensurePresetCredentials(
  filePath = DEFAULT_CREDENTIALS_PATH,
): Promise<PresetCredentials> {
  let rawCredentials: string;

  try {
    rawCredentials = await readFile(filePath, "utf8");
  } catch (error) {
    const errorCode =
      error instanceof Error && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;

    if (errorCode !== "ENOENT") {
      throw error;
    }

    const credentials = createPresetCredentials();
    await mkdir(path.dirname(filePath), { mode: 0o700, recursive: true });
    await writeFile(filePath, `${JSON.stringify(credentials, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await chmod(filePath, 0o600);

    return credentials;
  }

  const stored: unknown = JSON.parse(rawCredentials);
  const current = presetCredentialsSchema.safeParse(stored);

  if (current.success) {
    await chmod(filePath, 0o600);
    return current.data;
  }

  const legacy = legacyPresetCredentialsSchema.safeParse(stored);

  if (!legacy.success) {
    return presetCredentialsSchema.parse(stored);
  }

  const credentials = migrateLegacyCredentials(legacy.data);
  await writeFile(filePath, `${JSON.stringify(credentials, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(filePath, 0o600);

  return credentials;
}

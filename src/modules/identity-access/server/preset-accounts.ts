import { hashPassword } from "better-auth/crypto";

import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import type { PresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";

type PreparedAccount = PresetCredentials["accounts"][number] & {
  passwordHash: string;
};

function presetAccountIds(account: PreparedAccount) {
  const suffix =
    account.email === "sales-secondary@torquelis.local"
      ? "sales-secondary"
      : account.role;

  return {
    accountId: `demo-account-${suffix}`,
    userId: `demo-user-${suffix}`,
  };
}

async function prepareAccounts(
  credentials: PresetCredentials,
): Promise<PreparedAccount[]> {
  return Promise.all(
    credentials.accounts.map(async (account) => ({
      ...account,
      passwordHash: await hashPassword(account.password),
    })),
  );
}

async function writePresetAccounts(
  transaction: Prisma.TransactionClient,
  accounts: PreparedAccount[],
): Promise<void> {
  for (const account of accounts) {
    const { accountId, userId } = presetAccountIds(account);

    await transaction.user.upsert({
      create: {
        email: account.email,
        emailVerified: true,
        id: userId,
        name: account.name,
        role: account.role,
      },
      update: {
        emailVerified: true,
        name: account.name,
        role: account.role,
      },
      where: { email: account.email },
    });

    await transaction.account.upsert({
      create: {
        accountId: userId,
        id: accountId,
        password: account.passwordHash,
        providerId: "credential",
        userId,
      },
      update: {
        accountId: userId,
        password: account.passwordHash,
        providerId: "credential",
        userId,
      },
      where: { id: accountId },
    });
  }
}

export async function seedPresetAccounts(
  prisma: PrismaClient,
  credentials: PresetCredentials,
): Promise<void> {
  const accounts = await prepareAccounts(credentials);
  await prisma.$transaction((transaction) =>
    writePresetAccounts(transaction, accounts),
  );
}

export async function replacePresetAccounts(
  prisma: PrismaClient,
  credentials: PresetCredentials,
): Promise<void> {
  const accounts = await prepareAccounts(credentials);

  await prisma.$transaction(async (transaction) => {
    await transaction.auditLog.deleteMany();
    await transaction.session.deleteMany();
    await transaction.account.deleteMany();
    await transaction.user.deleteMany();
    await writePresetAccounts(transaction, accounts);
  });
}

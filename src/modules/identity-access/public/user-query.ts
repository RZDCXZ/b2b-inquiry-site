import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";
import { findFirstUserIdByRole } from "@/src/modules/identity-access/server/user-query";

export async function findFirstSalesRecipientId({
  prisma,
}: {
  prisma?: ApplicationDatabase;
} = {}): Promise<string | null> {
  return findFirstUserIdByRole({ prisma, role: "sales" });
}

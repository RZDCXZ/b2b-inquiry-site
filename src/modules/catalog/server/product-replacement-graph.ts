import type { Prisma } from "@/src/generated/prisma/client";

export async function lockProductReplacementGraph(
  prisma: Pick<Prisma.TransactionClient, "$executeRaw">,
): Promise<void> {
  await prisma.$executeRaw`SELECT pg_advisory_xact_lock(13, 8)`;
}

import type { PrismaClient } from "@/src/generated/prisma/client";
import { assertDatabaseIdentity } from "@/src/modules/site-config/public/local-demo-target";

export async function verifyLocalDatabaseIdentity(
  prisma: PrismaClient,
): Promise<void> {
  const identity = await prisma.environmentIdentity.findUnique({
    select: {
      databaseId: true,
      environmentMarker: true,
    },
    where: { key: "primary" },
  });

  assertDatabaseIdentity(identity);
}

import type { PrismaClient } from "@/src/generated/prisma/client";
import { z } from "zod";

import {
  LOCAL_DATABASE_ID,
  LOCAL_ENVIRONMENT_MARKER,
} from "@/src/modules/site-config/public/local-demo-target";

const storedDatabaseIdentitySchema = z.object({
  databaseId: z.literal(LOCAL_DATABASE_ID),
  environmentMarker: z.literal(LOCAL_ENVIRONMENT_MARKER),
});

type StoredDatabaseIdentity = {
  databaseId: string;
  environmentMarker: string;
};

export function assertLocalDatabaseIdentity(
  identity: StoredDatabaseIdentity | null,
): void {
  if (!storedDatabaseIdentitySchema.safeParse(identity).success) {
    throw new Error("Refusing demo operation: database identity is unknown.");
  }
}

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

  assertLocalDatabaseIdentity(identity);
}

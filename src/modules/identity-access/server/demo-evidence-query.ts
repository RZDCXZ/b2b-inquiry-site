import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";

export async function readIdentityDemoEvidence() {
  const prisma = getApplicationPrisma();

  return {
    users: await prisma.user.count(),
  };
}

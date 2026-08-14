import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import type { AppRole } from "@/src/generated/prisma/client";

export async function findFirstUserIdByRole({
  prisma = getApplicationPrisma(),
  role,
}: {
  prisma?: ApplicationDatabase;
  role: AppRole;
}): Promise<string | null> {
  const user = await prisma.user.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
    where: { role },
  });
  return user?.id ?? null;
}

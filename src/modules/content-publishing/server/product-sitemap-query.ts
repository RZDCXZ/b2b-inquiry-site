import type { PrismaClient } from "@/src/generated/prisma/client";

export async function listCurrentProductSitemapContent(prisma: PrismaClient) {
  return prisma.product.findMany({
    orderBy: { partNumber: "asc" },
    select: {
      currentPublication: {
        select: {
          publishedAt: true,
          slugEn: true,
          slugZhCn: true,
        },
      },
      partNumber: true,
    },
    where: { currentPublicationId: { not: null } },
  });
}

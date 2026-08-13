import type { PrismaClient } from "@/src/generated/prisma/client";

export type PublishedProductContent = {
  nameEn: string;
  nameZhCn: string;
  productId: string;
  slugEn: string;
  slugZhCn: string;
  summaryEn: string;
  summaryZhCn: string;
};

export async function listPublishedProductContent(
  prisma: PrismaClient,
  publicationIds: string[],
): Promise<PublishedProductContent[]> {
  if (publicationIds.length === 0) {
    return [];
  }

  return prisma.productPublication.findMany({
    select: {
      nameEn: true,
      nameZhCn: true,
      productId: true,
      slugEn: true,
      slugZhCn: true,
      summaryEn: true,
      summaryZhCn: true,
    },
    where: { id: { in: publicationIds } },
  });
}

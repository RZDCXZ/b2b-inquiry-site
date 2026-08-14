import type { PrismaClient } from "@/src/generated/prisma/client";

export type PublishedProductContent = {
  descriptionEn: string;
  descriptionZhCn: string;
  fitmentSummaryEn: string;
  fitmentSummaryZhCn: string;
  imageAltEn: string;
  imageAltZhCn: string;
  nameEn: string;
  nameZhCn: string;
  productId: string;
  seoDescriptionEn: string;
  seoDescriptionZhCn: string;
  seoTitleEn: string;
  seoTitleZhCn: string;
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
      descriptionEn: true,
      descriptionZhCn: true,
      fitmentSummaryEn: true,
      fitmentSummaryZhCn: true,
      imageAltEn: true,
      imageAltZhCn: true,
      nameEn: true,
      nameZhCn: true,
      productId: true,
      seoDescriptionEn: true,
      seoDescriptionZhCn: true,
      seoTitleEn: true,
      seoTitleZhCn: true,
      slugEn: true,
      slugZhCn: true,
      summaryEn: true,
      summaryZhCn: true,
    },
    where: { id: { in: publicationIds } },
  });
}

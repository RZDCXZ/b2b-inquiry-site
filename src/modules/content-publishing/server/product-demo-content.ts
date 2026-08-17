import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  DEMO_DATASET_TIMESTAMP,
  DEMO_PUBLISHED_PRODUCTS,
} from "@/src/modules/catalog/public/demo-catalog-fixtures";

async function writePublishedProductContent(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  for (const product of DEMO_PUBLISHED_PRODUCTS) {
    await transaction.productPublication.createMany({
      data: {
        categoryId: product.categoryId,
        descriptionEn: product.descriptionEn,
        descriptionZhCn: product.descriptionZhCn,
        fitmentSummaryEn: product.fitmentSummaryEn,
        fitmentSummaryZhCn: product.fitmentSummaryZhCn,
        id: product.publicationId!,
        imageAltEn: `${product.nameEn} fictional product image`,
        imageAltZhCn: `${product.nameZhCn}虚构产品图片`,
        imageAssetId: product.imageAssetId,
        imagePath: product.imagePath,
        nameEn: product.nameEn,
        nameZhCn: product.nameZhCn,
        productId: product.id,
        publishedAt: DEMO_DATASET_TIMESTAMP,
        replacementProductId: product.replacementProductId,
        seoDescriptionEn: product.seoDescriptionEn,
        seoDescriptionZhCn: product.seoDescriptionZhCn,
        seoTitleEn: product.seoTitleEn,
        seoTitleZhCn: product.seoTitleZhCn,
        slugEn: product.slugEn,
        slugZhCn: product.slugZhCn,
        sourceDraftVersion: 1,
        status: product.status,
        summaryEn: product.summaryEn,
        summaryZhCn: product.summaryZhCn,
        version: 1,
      },
      skipDuplicates: true,
    });
  }
}

export async function seedPublishedProductContent(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction((transaction) =>
    writePublishedProductContent(transaction),
  );
}

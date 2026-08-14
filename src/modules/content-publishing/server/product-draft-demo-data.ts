import type { PrismaClient } from "@/src/generated/prisma/client";

export async function seedProductDraftDemoData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const products = await transaction.product.findMany({
      orderBy: { partNumber: "asc" },
    });

    await transaction.productDraftSpecificationValue.deleteMany();
    await transaction.productDraftReference.deleteMany();
    await transaction.productDraftFitment.deleteMany();

    for (const product of products) {
      const publicationRecord = product.currentPublicationId
        ? await transaction.productPublication.findUnique({
            where: { id: product.currentPublicationId },
          })
        : null;
      const specificationValues = publicationRecord
        ? await transaction.productSpecificationValue.findMany({
            where: { publicationId: publicationRecord.id },
          })
        : [];
      const references = publicationRecord
        ? await transaction.productReference.findMany({
            where: { publicationId: publicationRecord.id },
          })
        : [];
      const fitments = publicationRecord
        ? await transaction.productFitment.findMany({
            where: { publicationId: publicationRecord.id },
          })
        : [];
      const publication = publicationRecord
        ? { ...publicationRecord, fitments, references, specificationValues }
        : null;
      const content = publication
        ? {
            categoryId: publication.categoryId ?? product.categoryId,
            descriptionEn: publication.descriptionEn,
            descriptionZhCn: publication.descriptionZhCn,
            fitmentSummaryEn: publication.fitmentSummaryEn,
            fitmentSummaryZhCn: publication.fitmentSummaryZhCn,
            imageAltEn: publication.imageAltEn,
            imageAltZhCn: publication.imageAltZhCn,
            imageAssetId: publication.imageAssetId,
            imagePath: publication.imagePath,
            documentAssetId: publication.documentAssetId,
            lastPublishedVersion: 1,
            nameEn: publication.nameEn,
            nameZhCn: publication.nameZhCn,
            replacementProductId: publication.replacementProductId,
            seoDescriptionEn: publication.seoDescriptionEn,
            seoDescriptionZhCn: publication.seoDescriptionZhCn,
            seoTitleEn: publication.seoTitleEn,
            seoTitleZhCn: publication.seoTitleZhCn,
            slugEn: publication.slugEn,
            slugZhCn: publication.slugZhCn,
            status: publication.status,
            summaryEn: publication.summaryEn,
            summaryZhCn: publication.summaryZhCn,
          }
        : {
            categoryId: product.categoryId,
            descriptionEn: "",
            descriptionZhCn: "",
            fitmentSummaryEn: "",
            fitmentSummaryZhCn: "",
            imageAltEn: "",
            imageAltZhCn: "",
            imageAssetId:
              product.imagePath === "/assets/fuel-filter-product.png"
                ? "asset-generated-fuel-filter-product"
                : "asset-generated-filter-family",
            imagePath: product.imagePath,
            documentAssetId: null,
            lastPublishedVersion: null,
            nameEn: "",
            nameZhCn: "",
            replacementProductId: null,
            seoDescriptionEn: "",
            seoDescriptionZhCn: "",
            seoTitleEn: "",
            seoTitleZhCn: "",
            slugEn: "",
            slugZhCn: "",
            status: "published" as const,
            summaryEn: "",
            summaryZhCn: "",
          };

      await transaction.productDraft.upsert({
        create: {
          ...content,
          productId: product.id,
          version: 1,
        },
        update: {
          ...content,
          lastModifiedByUserId: null,
          restoredFromPublicationId: null,
          version: 1,
        },
        where: { productId: product.id },
      });

      if (!publication) {
        continue;
      }

      if (publication.specificationValues.length > 0) {
        await transaction.productDraftSpecificationValue.createMany({
          data: publication.specificationValues.map(
            ({ publicationId, ...value }) => {
              void publicationId;
              return { ...value, productId: product.id };
            },
          ),
        });
      }
      if (publication.references.length > 0) {
        await transaction.productDraftReference.createMany({
          data: publication.references.map(({ brand, referenceNumber }) => ({
            brand,
            productId: product.id,
            referenceNumber,
          })),
        });
      }
      if (publication.fitments.length > 0) {
        await transaction.productDraftFitment.createMany({
          data: publication.fitments.map(
            ({ engineId, vehicleModelId, yearFrom, yearTo }) => ({
              engineId,
              productId: product.id,
              vehicleModelId,
              yearFrom,
              yearTo,
            }),
          ),
        });
      }
    }

    await transaction.productPublication.updateMany({
      data: { sealedAt: new Date() },
      where: { sealedAt: null },
    });
  });
}

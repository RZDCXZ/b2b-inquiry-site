import type { PrismaClient } from "@/src/generated/prisma/client";
import {
  DEMO_CATALOG_PRODUCTS,
  DEMO_DATASET_TIMESTAMP,
} from "@/src/modules/catalog/public/demo-catalog-fixtures";
import {
  createSpecificationSnapshotValues,
  INITIAL_SPECIFICATION_DEFINITIONS,
} from "@/src/modules/catalog/public/specifications";

const draftProductFitments = [
  {
    engineId: "engine-c10-350",
    vehicleModelId: "model-calder-cx7",
    yearFrom: 2017,
    yearTo: 2022,
  },
  {
    engineId: "engine-m8-290",
    vehicleModelId: "model-marovia-mr6",
    yearFrom: 2018,
    yearTo: 2023,
  },
  {
    engineId: "engine-e9-315",
    vehicleModelId: "model-eliston-et7",
    yearFrom: 2019,
    yearTo: 2024,
  },
] as const;

const draftProductSpecificationValues = createSpecificationSnapshotValues(
  INITIAL_SPECIFICATION_DEFINITIONS.fuel,
  [
    { attributeCode: "construction_type", value: "spin_on" },
    { attributeCode: "outer_diameter", unit: "millimetre", value: 108 },
    { attributeCode: "height", unit: "millimetre", value: 184 },
    { attributeCode: "connection_specification", value: "M18 × 1.5" },
    { attributeCode: "filtration_rating", unit: "micrometre", value: 9 },
    { attributeCode: "rated_flow", unit: "litre_per_minute", value: 5.8 },
    { attributeCode: "water_separation", value: true },
  ],
);

export async function seedProductDraftDemoData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.productDraftSpecificationValue.deleteMany();
    await transaction.productDraftReference.deleteMany();
    await transaction.productDraftFitment.deleteMany();

    for (const fixture of DEMO_CATALOG_PRODUCTS) {
      const publicationRecord = fixture.publicationId
        ? await transaction.productPublication.findUnique({
            where: { id: fixture.publicationId },
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
      const content = {
        categoryId: fixture.categoryId,
        descriptionEn: fixture.descriptionEn,
        descriptionZhCn: fixture.descriptionZhCn,
        documentAssetId: null,
        fitmentSummaryEn: fixture.fitmentSummaryEn,
        fitmentSummaryZhCn: fixture.fitmentSummaryZhCn,
        imageAltEn: `${fixture.nameEn} fictional product image`,
        imageAltZhCn: `${fixture.nameZhCn}虚构产品图片`,
        imageAssetId: fixture.imageAssetId,
        imagePath: fixture.imagePath,
        lastModifiedByUserId: null,
        lastPublishedVersion: publicationRecord ? 1 : null,
        nameEn: fixture.nameEn,
        nameZhCn: fixture.nameZhCn,
        replacementProductId: fixture.replacementProductId,
        restoredFromPublicationId: null,
        seoDescriptionEn: fixture.seoDescriptionEn,
        seoDescriptionZhCn: fixture.seoDescriptionZhCn,
        seoTitleEn: fixture.seoTitleEn,
        seoTitleZhCn: fixture.seoTitleZhCn,
        slugEn: fixture.slugEn,
        slugZhCn: fixture.slugZhCn,
        status: fixture.status === "draft" ? "published" : fixture.status,
        summaryEn: fixture.summaryEn,
        summaryZhCn: fixture.summaryZhCn,
        updatedAt: DEMO_DATASET_TIMESTAMP,
        version: 1,
      };

      await transaction.productDraft.upsert({
        create: { ...content, productId: fixture.id },
        update: content,
        where: { productId: fixture.id },
      });

      if (publicationRecord) {
        if (specificationValues.length > 0) {
          await transaction.productDraftSpecificationValue.createMany({
            data: specificationValues.map(({ publicationId, ...value }) => {
              void publicationId;
              return { ...value, productId: fixture.id };
            }),
          });
        }
        if (references.length > 0) {
          await transaction.productDraftReference.createMany({
            data: references.map(({ brand, id, referenceNumber }) => ({
              brand,
              id: `draft-${id}`,
              productId: fixture.id,
              referenceNumber,
            })),
          });
        }
        if (fitments.length > 0) {
          await transaction.productDraftFitment.createMany({
            data: fitments.map(
              ({ engineId, id, vehicleModelId, yearFrom, yearTo }) => ({
                engineId,
                id: `draft-${id}`,
                productId: fixture.id,
                vehicleModelId,
                yearFrom,
                yearTo,
              }),
            ),
          });
        }
        continue;
      }

      await transaction.productDraftSpecificationValue.createMany({
        data: draftProductSpecificationValues.map((value) => ({
          ...value,
          productId: fixture.id,
        })),
      });
      await transaction.productDraftReference.createMany({
        data: fixture.references.map((reference, index) => ({
          ...reference,
          id: `draft-reference-${fixture.id}-${index + 1}`,
          productId: fixture.id,
        })),
      });
      await transaction.productDraftFitment.createMany({
        data: draftProductFitments.map((fitment, index) => ({
          ...fitment,
          id: `draft-fitment-${fixture.id}-${index + 1}`,
          productId: fixture.id,
        })),
      });
    }

    await transaction.productPublication.updateMany({
      data: { sealedAt: DEMO_DATASET_TIMESTAMP },
      where: { sealedAt: null },
    });
  });
}

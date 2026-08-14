import {
  getProductDraft,
  ProductPublishingError,
  saveProductDraft,
} from "@/src/application/product-publishing";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { normalizeProductNumber } from "@/src/modules/catalog/public/product-identity";
import type { ProductStatus } from "@/src/modules/catalog/public/product-lifecycle";

type EditableProductStatus = Exclude<ProductStatus, "draft">;

export type ProductLifecycleErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "PUBLICATION_REQUIRED"
  | "REPLACEMENT_NOT_FOUND"
  | "REPLACEMENT_NOT_PUBLIC"
  | "REPLACEMENT_CYCLE"
  | "REPLACEMENT_SELF_REFERENCE"
  | "REPLACEMENT_STATUS_INVALID";

export class ProductLifecycleError extends Error {
  constructor(
    readonly code: ProductLifecycleErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProductLifecycleError";
  }
}

export async function setProductLifecycle({
  actor,
  expectedDraftVersion,
  partNumber,
  prisma = getApplicationPrisma(),
  replacementPartNumber,
  status,
}: {
  actor: AdminActor;
  expectedDraftVersion: number;
  partNumber: string;
  prisma?: ApplicationDatabase;
  replacementPartNumber?: string;
  status: EditableProductStatus;
}): Promise<{
  partNumber: string;
  replacementPartNumber: string | null;
  status: EditableProductStatus;
}> {
  const draft = await getProductDraft({ actor, partNumber, prisma });

  try {
    await saveProductDraft({
      actor,
      expectedDraftVersion,
      input: {
        categoryId: draft.categoryId,
        descriptionEn: draft.descriptionEn,
        descriptionZhCn: draft.descriptionZhCn,
        fitmentSummaryEn: draft.fitmentSummaryEn,
        fitmentSummaryZhCn: draft.fitmentSummaryZhCn,
        imageAltEn: draft.imageAltEn,
        imageAltZhCn: draft.imageAltZhCn,
        imagePath: draft.imagePath,
        nameEn: draft.nameEn,
        nameZhCn: draft.nameZhCn,
        references: draft.references.map(({ brand, referenceNumber }) => ({
          brand,
          referenceNumber,
        })),
        replacementPartNumber: replacementPartNumber ?? null,
        seoDescriptionEn: draft.seoDescriptionEn,
        seoDescriptionZhCn: draft.seoDescriptionZhCn,
        seoTitleEn: draft.seoTitleEn,
        seoTitleZhCn: draft.seoTitleZhCn,
        slugEn: draft.slugEn,
        slugZhCn: draft.slugZhCn,
        specifications: draft.specificationValues.map((value) => ({
          attributeCode: value.attributeCode,
          unit: value.baseUnit ?? undefined,
          value:
            value.dataType === "decimal"
              ? value.decimalValue?.toNumber()
              : value.dataType === "boolean"
                ? value.booleanValue
                : value.dataType === "enumeration"
                  ? value.enumerationValue
                  : value.textValue,
        })),
        status,
        summaryEn: draft.summaryEn,
        summaryZhCn: draft.summaryZhCn,
      },
      partNumber: draft.partNumber,
      prisma,
    });
  } catch (error) {
    if (
      error instanceof ProductPublishingError &&
      error.code === "INVALID_DRAFT"
    ) {
      const replacementErrors = error.fieldErrors.filter(
        ({ field }) => field === "replacementPartNumber",
      );
      if (
        replacementErrors.length === error.fieldErrors.length &&
        replacementErrors[0]?.reason
      ) {
        throw new ProductLifecycleError(
          replacementErrors[0].reason,
          replacementErrors[0].message,
        );
      }
    }
    throw error;
  }

  const savedReplacement = replacementPartNumber
    ? await prisma.product.findUniqueOrThrow({
        select: { partNumber: true },
        where: {
          normalizedPartNumber: normalizeProductNumber(replacementPartNumber),
        },
      })
    : null;

  return {
    partNumber: draft.partNumber,
    replacementPartNumber: savedReplacement?.partNumber ?? null,
    status,
  };
}

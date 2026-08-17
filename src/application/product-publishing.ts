import { randomUUID } from "node:crypto";

import type { Prisma } from "@/src/generated/prisma/client";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import { normalizeProductNumber } from "@/src/modules/catalog/public/product-identity";
import type { ProductStatus } from "@/src/modules/catalog/public/product-lifecycle";
import {
  formatProductSpecification,
  type SpecificationSnapshotValue,
  type UnitSystem,
} from "@/src/modules/catalog/public/specifications";
import { validateProductSpecificationsForCategory } from "@/src/modules/catalog/server/product-specification-service";
import { lockProductReplacementGraph } from "@/src/modules/catalog/server/product-replacement-graph";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import { validateRestrictedRichText } from "@/src/modules/content-publishing/public/restricted-rich-text";

export type ProductPublishingFieldError = {
  field: string;
  message: string;
  reason?:
    | "REPLACEMENT_CYCLE"
    | "REPLACEMENT_NOT_FOUND"
    | "REPLACEMENT_NOT_PUBLIC"
    | "REPLACEMENT_SELF_REFERENCE"
    | "REPLACEMENT_STATUS_INVALID";
};

export type ProductDraftConflict = {
  latestModifiedAt: Date;
  latestModifiedBy: string;
  latestVersion: number;
};

export class ProductPublishingError extends Error {
  constructor(
    readonly code:
      | "FORBIDDEN"
      | "CONFLICT"
      | "HARD_DELETE_FORBIDDEN"
      | "INVALID_DRAFT"
      | "NOT_FOUND"
      | "NOTHING_TO_PUBLISH"
      | "PUBLISH_VALIDATION_FAILED",
    readonly fieldErrors: ProductPublishingFieldError[] = [],
    readonly conflict?: ProductDraftConflict,
  ) {
    super(code);
    this.name = "ProductPublishingError";
  }
}

export type ProductPublishingBatchSelection = {
  expectedDraftVersion: number;
  partNumber: string;
};

export type ProductPublishingBatchItemPreview = {
  expectedDraftVersion: number;
  fieldErrors: ProductPublishingFieldError[];
  nameZhCn: string | null;
  partNumber: string;
  status: "already_published" | "conflict" | "invalid" | "not_found" | "ready";
};

export type ProductPublishingBatchPreview = {
  allReady: boolean;
  items: ProductPublishingBatchItemPreview[];
};

export class ProductBatchPublishingError extends Error {
  constructor(
    readonly code:
      | "CONFLICT"
      | "FORBIDDEN"
      | "INVALID_SELECTION"
      | "NOTHING_TO_PUBLISH"
      | "TRANSACTION_FAILED"
      | "VALIDATION_FAILED",
    readonly preview?: ProductPublishingBatchPreview,
  ) {
    super(code);
    this.name = "ProductBatchPublishingError";
  }
}

function assertCanManageProducts(actor: AdminActor): void {
  if (
    actor.role !== APP_ROLES.ADMINISTRATOR &&
    actor.role !== APP_ROLES.CONTENT_EDITOR
  ) {
    throw new ProductPublishingError("FORBIDDEN");
  }
}

const requiredEnglishTextFields = [
  "imageAltEn",
  "nameEn",
  "slugEn",
  "summaryEn",
  "descriptionEn",
  "seoTitleEn",
  "seoDescriptionEn",
  "fitmentSummaryEn",
] as const;

const requiredChineseTextFields = [
  "imageAltZhCn",
  "nameZhCn",
  "slugZhCn",
  "summaryZhCn",
  "descriptionZhCn",
  "seoTitleZhCn",
  "seoDescriptionZhCn",
  "fitmentSummaryZhCn",
] as const;

const requiredTextFields = [
  "imagePath",
  ...requiredEnglishTextFields,
  ...requiredChineseTextFields,
] as const;

type ProductDraftSpecificationInput = {
  attributeCode: string;
  unit?: string;
  value: unknown;
};

export type ProductDraftInput = {
  categoryId: string;
  descriptionEn: string;
  descriptionZhCn: string;
  fitmentSummaryEn: string;
  fitmentSummaryZhCn: string;
  imageAltEn: string;
  imageAltZhCn: string;
  imageAssetId?: string | null;
  imagePath: string;
  nameEn: string;
  nameZhCn: string;
  references: Array<{ brand: string; referenceNumber: string }>;
  replacementPartNumber: string | null;
  seoDescriptionEn: string;
  seoDescriptionZhCn: string;
  seoTitleEn: string;
  seoTitleZhCn: string;
  slugEn: string;
  slugZhCn: string;
  specifications: ProductDraftSpecificationInput[];
  status: Exclude<ProductStatus, "draft">;
  summaryEn: string;
  summaryZhCn: string;
};

const conflictProjection = {
  lastModifiedBy: { select: { name: true } },
  updatedAt: true,
  version: true,
} satisfies Prisma.ProductDraftSelect;

async function latestDraftConflict(
  prisma: Pick<ApplicationDatabase, "productDraft">,
  productId: string,
): Promise<ProductDraftConflict> {
  const latest = await prisma.productDraft.findUniqueOrThrow({
    select: conflictProjection,
    where: { productId },
  });

  return {
    latestModifiedAt: latest.updatedAt,
    latestModifiedBy: latest.lastModifiedBy?.name ?? "系统",
    latestVersion: latest.version,
  };
}

function normalizeReferences(
  references: ProductDraftInput["references"],
): ProductDraftInput["references"] {
  const normalized = references.map(({ brand, referenceNumber }) => ({
    brand: brand.trim(),
    referenceNumber: referenceNumber.trim(),
  }));
  const keys = new Set<string>();

  for (const reference of normalized) {
    if (
      !reference.brand ||
      !normalizeProductNumber(reference.referenceNumber)
    ) {
      throw new ProductPublishingError("INVALID_DRAFT", [
        { field: "references", message: "参考号品牌和号码不能为空。" },
      ]);
    }

    const key = `${reference.brand.toLocaleLowerCase()}::${normalizeProductNumber(reference.referenceNumber)}`;
    if (keys.has(key)) {
      throw new ProductPublishingError("INVALID_DRAFT", [
        { field: "references", message: "同一品牌的参考号不能重复。" },
      ]);
    }
    keys.add(key);
  }

  return normalized;
}

async function resolveReplacementProduct(
  prisma: Pick<ApplicationDatabase, "product" | "productDraft">,
  {
    graph = "draft",
    productId,
    replacementPartNumber,
    status,
    validateCycle = true,
  }: {
    graph?: "draft" | "published";
    productId: string;
    replacementPartNumber: string | null;
    status: ProductDraftInput["status"];
    validateCycle?: boolean;
  },
) {
  if (status !== "discontinued" && replacementPartNumber) {
    throw new ProductPublishingError("INVALID_DRAFT", [
      {
        field: "replacementPartNumber",
        message: "只有已停产产品可以设置替代产品。",
        reason: "REPLACEMENT_STATUS_INVALID",
      },
    ]);
  }

  if (!replacementPartNumber) {
    return null;
  }

  const replacement = await prisma.product.findUnique({
    select: {
      currentPublication: { select: { status: true } },
      id: true,
      partNumber: true,
    },
    where: {
      normalizedPartNumber: normalizeProductNumber(replacementPartNumber),
    },
  });

  if (!replacement) {
    throw new ProductPublishingError("INVALID_DRAFT", [
      {
        field: "replacementPartNumber",
        message: "替代产品不存在。",
        reason: "REPLACEMENT_NOT_FOUND",
      },
    ]);
  }

  if (
    replacement.currentPublication?.status === "draft" ||
    !replacement.currentPublication
  ) {
    throw new ProductPublishingError("INVALID_DRAFT", [
      {
        field: "replacementPartNumber",
        message: "替代产品必须已有公开版本。",
        reason: "REPLACEMENT_NOT_PUBLIC",
      },
    ]);
  }

  if (replacement.id === productId) {
    throw new ProductPublishingError("INVALID_DRAFT", [
      {
        field: "replacementPartNumber",
        message: "产品不能替代自身。",
        reason: "REPLACEMENT_SELF_REFERENCE",
      },
    ]);
  }

  if (!validateCycle) return replacement;

  const nextProductIdById =
    graph === "published"
      ? new Map(
          (
            await prisma.product.findMany({
              select: {
                currentPublication: {
                  select: { replacementProductId: true },
                },
                id: true,
              },
            })
          ).map(({ currentPublication, id }) => [
            id,
            currentPublication?.replacementProductId ?? null,
          ]),
        )
      : new Map(
          (
            await prisma.productDraft.findMany({
              select: { productId: true, replacementProductId: true },
            })
          ).map(({ productId, replacementProductId }) => [
            productId,
            replacementProductId,
          ]),
        );
  const visited = new Set<string>();
  let candidateId: string | null = replacement.id;

  while (candidateId) {
    if (candidateId === productId || visited.has(candidateId)) {
      throw new ProductPublishingError("INVALID_DRAFT", [
        {
          field: "replacementPartNumber",
          message: "替代关系不能形成循环。",
          reason: "REPLACEMENT_CYCLE",
        },
      ]);
    }
    visited.add(candidateId);
    candidateId = nextProductIdById.get(candidateId) ?? null;
  }

  return replacement;
}

type PersistedSpecificationSnapshot = Omit<
  SpecificationSnapshotValue,
  "decimalValue"
> & {
  decimalValue: number | Prisma.Decimal | null;
};

function specificationSnapshotData(value: PersistedSpecificationSnapshot) {
  return {
    attributeCode: value.attributeCode,
    attributeId: value.attributeId,
    baseUnit: value.baseUnit,
    booleanValue: value.booleanValue,
    dataType: value.dataType,
    decimalValue: value.decimalValue,
    enumerationLabelEn: value.enumerationLabelEn,
    enumerationLabelZhCn: value.enumerationLabelZhCn,
    enumerationValue: value.enumerationValue,
    nameEn: value.nameEn,
    nameZhCn: value.nameZhCn,
    position: value.position,
    textValue: value.textValue,
  };
}

function specificationCreateData(
  productId: string,
  values: PersistedSpecificationSnapshot[],
) {
  return values.map((value) => ({
    ...specificationSnapshotData(value),
    productId,
  }));
}

function publicationSpecificationCreateData(
  publicationId: string,
  values: PersistedSpecificationSnapshot[],
) {
  return values.map((value) => ({
    ...specificationSnapshotData(value),
    publicationId,
  }));
}

function specificationInputFromSnapshot(
  value: PersistedSpecificationSnapshot,
): ProductDraftSpecificationInput {
  let inputValue: unknown;

  switch (value.dataType) {
    case "decimal":
      inputValue =
        typeof value.decimalValue === "number"
          ? value.decimalValue
          : (value.decimalValue?.toNumber() ?? Number.NaN);
      break;
    case "boolean":
      inputValue = value.booleanValue;
      break;
    case "enumeration":
      inputValue = value.enumerationValue;
      break;
    case "text":
      inputValue = value.textValue;
      break;
  }

  return {
    attributeCode: value.attributeCode,
    unit: value.baseUnit ?? undefined,
    value: inputValue,
  };
}

function draftLanguageCompleteness(
  draft: Pick<
    ProductDraftInput,
    | (typeof requiredEnglishTextFields)[number]
    | (typeof requiredChineseTextFields)[number]
  >,
) {
  return {
    en: requiredEnglishTextFields.every(
      (field) => draft[field].trim().length > 0,
    ),
    zhCn: requiredChineseTextFields.every(
      (field) => draft[field].trim().length > 0,
    ),
  };
}

async function draftSpecificationsArePublishable(
  prisma: ApplicationDatabase,
  draft: {
    categoryId: string;
    specificationValues: PersistedSpecificationSnapshot[];
  },
): Promise<boolean> {
  try {
    await validateProductSpecificationsForCategory(prisma, {
      categoryId: draft.categoryId,
      values: draft.specificationValues.map(specificationInputFromSnapshot),
    });
    return true;
  } catch {
    return false;
  }
}

export async function getProductDraft({
  actor,
  partNumber,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  partNumber: string;
  prisma?: ApplicationDatabase;
}) {
  assertCanManageProducts(actor);

  const product = await prisma.product.findUnique({
    select: {
      currentPublicationId: true,
      draft: {
        include: {
          category: {
            include: {
              specificationAttributes: {
                include: { options: { orderBy: { position: "asc" } } },
                orderBy: { position: "asc" },
              },
            },
          },
          documentAsset: {
            select: {
              byteSize: true,
              createdAt: true,
              id: true,
              originalFilename: true,
            },
          },
          lastModifiedBy: { select: { id: true, name: true } },
          references: {
            orderBy: [{ brand: "asc" }, { referenceNumber: "asc" }],
          },
          replacementProduct: { select: { id: true, partNumber: true } },
          specificationValues: { orderBy: { position: "asc" } },
        },
      },
      publications: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          publishedAt: true,
          publishedBy: { select: { id: true, name: true } },
          restoredFromPublicationId: true,
          version: true,
        },
      },
      partNumber: true,
      status: true,
    },
    where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
  });

  if (!product?.draft) {
    throw new ProductPublishingError("NOT_FOUND");
  }

  const languageCompleteness = draftLanguageCompleteness(product.draft);
  const specifications = await draftSpecificationsArePublishable(
    prisma,
    product.draft,
  );
  let replacement = true;
  try {
    await resolveReplacementProduct(prisma, {
      graph: "published",
      productId: product.draft.productId,
      replacementPartNumber:
        product.draft.replacementProduct?.partNumber ?? null,
      status: product.draft.status as ProductDraftInput["status"],
    });
  } catch {
    replacement = false;
  }

  return {
    ...product.draft,
    currentPublicationId: product.currentPublicationId,
    partNumber: product.partNumber,
    productStatus: product.status,
    publicationReadiness: {
      bilingualContent: languageCompleteness.en && languageCompleteness.zhCn,
      image: product.draft.imagePath.trim().length > 0,
      references: product.draft.references.length > 0,
      replacement,
      specifications,
    },
    publications: product.publications,
  };
}

export async function listProductDrafts({
  actor,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  prisma?: ApplicationDatabase;
}) {
  assertCanManageProducts(actor);

  const products = await prisma.product.findMany({
    orderBy: { partNumber: "asc" },
    select: {
      category: { select: { nameZhCn: true } },
      draft: {
        select: {
          descriptionEn: true,
          descriptionZhCn: true,
          fitmentSummaryEn: true,
          fitmentSummaryZhCn: true,
          imageAltEn: true,
          imageAltZhCn: true,
          lastModifiedBy: { select: { name: true } },
          lastPublishedVersion: true,
          nameEn: true,
          nameZhCn: true,
          seoDescriptionEn: true,
          seoDescriptionZhCn: true,
          seoTitleEn: true,
          seoTitleZhCn: true,
          slugEn: true,
          slugZhCn: true,
          summaryEn: true,
          summaryZhCn: true,
          updatedAt: true,
          version: true,
        },
      },
      id: true,
      partNumber: true,
      status: true,
    },
  });

  return products.map((product) => ({
    ...product,
    draft: product.draft
      ? {
          ...product.draft,
          languageCompleteness: draftLanguageCompleteness(product.draft),
        }
      : null,
  }));
}

export async function listRecentProductPublications({
  actor,
  prisma = getApplicationPrisma(),
  take = 30,
}: {
  actor: AdminActor;
  prisma?: ApplicationDatabase;
  take?: number;
}) {
  assertCanManageProducts(actor);

  return prisma.productPublication.findMany({
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      nameZhCn: true,
      product: {
        select: { currentPublicationId: true, partNumber: true },
      },
      publishedAt: true,
      publishedBy: { select: { name: true } },
      restoredFromPublicationId: true,
      sourceDraftVersion: true,
      version: true,
    },
    take,
  });
}

export async function getProductDraftPreview({
  actor,
  locale,
  partNumber,
  prisma = getApplicationPrisma(),
  unitSystem = "metric",
}: {
  actor: AdminActor;
  locale: PublicLocale;
  partNumber: string;
  prisma?: ApplicationDatabase;
  unitSystem?: UnitSystem;
}) {
  assertCanManageProducts(actor);
  const product = await prisma.product.findUnique({
    select: {
      draft: {
        select: {
          category: { select: { nameEn: true, nameZhCn: true } },
          descriptionEn: true,
          descriptionZhCn: true,
          documentAsset: {
            select: { id: true, originalFilename: true },
          },
          fitmentSummaryEn: true,
          fitmentSummaryZhCn: true,
          fitments: {
            include: {
              engine: {
                include: { vehicleModel: { include: { make: true } } },
              },
            },
            orderBy: [{ vehicleModelId: "asc" }, { yearFrom: "asc" }],
          },
          imageAltEn: true,
          imageAltZhCn: true,
          imagePath: true,
          nameEn: true,
          nameZhCn: true,
          references: {
            orderBy: [{ brand: "asc" }, { referenceNumber: "asc" }],
            select: { brand: true, referenceNumber: true },
          },
          seoDescriptionEn: true,
          seoDescriptionZhCn: true,
          seoTitleEn: true,
          seoTitleZhCn: true,
          slugEn: true,
          slugZhCn: true,
          specificationValues: { orderBy: { position: "asc" } },
          status: true,
          summaryEn: true,
          summaryZhCn: true,
          version: true,
        },
      },
      partNumber: true,
    },
    where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
  });

  if (!product?.draft) {
    throw new ProductPublishingError("NOT_FOUND");
  }

  const draft = { ...product.draft, partNumber: product.partNumber };
  const english = locale === "en";

  return {
    category: english ? draft.category.nameEn : draft.category.nameZhCn,
    description: english ? draft.descriptionEn : draft.descriptionZhCn,
    document: draft.documentAsset,
    fitments: draft.fitments.map((fitment) => ({
      engine: fitment.engine.code,
      make: fitment.engine.vehicleModel.make.name,
      model: fitment.engine.vehicleModel.name,
      yearFrom: fitment.yearFrom,
      yearTo: fitment.yearTo,
    })),
    fitmentSummary: english ? draft.fitmentSummaryEn : draft.fitmentSummaryZhCn,
    imageAlt: english ? draft.imageAltEn : draft.imageAltZhCn,
    imagePath: draft.imagePath,
    locale,
    name: english ? draft.nameEn : draft.nameZhCn,
    partNumber: draft.partNumber,
    references: draft.references.map(({ brand, referenceNumber }) => ({
      brand,
      referenceNumber,
    })),
    seoDescription: english ? draft.seoDescriptionEn : draft.seoDescriptionZhCn,
    seoTitle: english ? draft.seoTitleEn : draft.seoTitleZhCn,
    slug: english ? draft.slugEn : draft.slugZhCn,
    specifications: draft.specificationValues.map((value) =>
      formatProductSpecification(
        {
          baseUnit: value.baseUnit,
          booleanValue: value.booleanValue,
          code: value.attributeCode,
          dataType: value.dataType,
          decimalValue: value.decimalValue?.toNumber() ?? null,
          enumerationLabelEn: value.enumerationLabelEn,
          enumerationLabelZhCn: value.enumerationLabelZhCn,
          enumerationValue: value.enumerationValue,
          nameEn: value.nameEn,
          nameZhCn: value.nameZhCn,
          textValue: value.textValue,
        },
        { locale, unitSystem },
      ),
    ),
    status: draft.status,
    summary: english ? draft.summaryEn : draft.summaryZhCn,
    unitSystem,
    version: draft.version,
  };
}

export async function saveProductDraft({
  actor,
  expectedDraftVersion,
  input,
  now = new Date(),
  partNumber,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  expectedDraftVersion: number;
  input: ProductDraftInput;
  now?: Date;
  partNumber: string;
  prisma?: ApplicationDatabase;
}) {
  assertCanManageProducts(actor);
  const references = normalizeReferences(input.references);
  for (const [field, value] of [
    ["descriptionEn", input.descriptionEn],
    ["descriptionZhCn", input.descriptionZhCn],
  ] as const) {
    const richText = validateRestrictedRichText(value);
    if (!richText.success) {
      throw new ProductPublishingError(
        "INVALID_DRAFT",
        richText.issues.map((message) => ({ field, message })),
      );
    }
  }

  return prisma.$transaction(
    async (transaction) => {
      const product = await transaction.product.findUnique({
        select: { id: true },
        where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
      });
      const draft = product
        ? await transaction.productDraft.findUnique({
            select: { version: true },
            where: { productId: product.id },
          })
        : null;

      if (!product || !draft) {
        throw new ProductPublishingError("NOT_FOUND");
      }

      if (draft.version !== expectedDraftVersion) {
        throw new ProductPublishingError(
          "CONFLICT",
          [],
          await latestDraftConflict(transaction, product.id),
        );
      }

      const specifications = await validateProductSpecificationsForCategory(
        transaction,
        {
          categoryId: input.categoryId,
          values: input.specifications,
        },
      ).catch(() => {
        throw new ProductPublishingError("INVALID_DRAFT", [
          { field: "specifications", message: "规格值未通过分类规则校验。" },
        ]);
      });
      await lockProductReplacementGraph(transaction);
      const replacement = await resolveReplacementProduct(transaction, {
        productId: product.id,
        replacementPartNumber: input.replacementPartNumber,
        status: input.status,
      });
      const imageAsset =
        input.imageAssetId === undefined || input.imageAssetId === null
          ? null
          : await transaction.asset.findFirst({
              where: { id: input.imageAssetId, kind: "image" },
            });
      if (input.imageAssetId && !imageAsset) {
        throw new ProductPublishingError("INVALID_DRAFT", [
          { field: "imageAssetId", message: "所选图片素材不存在。" },
        ]);
      }

      const update = await transaction.productDraft.updateMany({
        data: {
          categoryId: input.categoryId,
          descriptionEn: input.descriptionEn.trim(),
          descriptionZhCn: input.descriptionZhCn.trim(),
          fitmentSummaryEn: input.fitmentSummaryEn.trim(),
          fitmentSummaryZhCn: input.fitmentSummaryZhCn.trim(),
          imageAltEn: imageAsset?.imageAltEn ?? input.imageAltEn.trim(),
          imageAltZhCn: imageAsset?.imageAltZhCn ?? input.imageAltZhCn.trim(),
          imageAssetId:
            input.imageAssetId === undefined ? undefined : input.imageAssetId,
          imagePath: imageAsset?.publicPath ?? input.imagePath.trim(),
          lastModifiedByUserId: actor.id,
          nameEn: input.nameEn.trim(),
          nameZhCn: input.nameZhCn.trim(),
          replacementProductId: replacement?.id ?? null,
          restoredFromPublicationId: null,
          seoDescriptionEn: input.seoDescriptionEn.trim(),
          seoDescriptionZhCn: input.seoDescriptionZhCn.trim(),
          seoTitleEn: input.seoTitleEn.trim(),
          seoTitleZhCn: input.seoTitleZhCn.trim(),
          slugEn: input.slugEn.trim(),
          slugZhCn: input.slugZhCn.trim(),
          status: input.status,
          summaryEn: input.summaryEn.trim(),
          summaryZhCn: input.summaryZhCn.trim(),
          updatedAt: now,
          version: { increment: 1 },
        },
        where: { productId: product.id, version: expectedDraftVersion },
      });

      if (update.count !== 1) {
        throw new ProductPublishingError(
          "CONFLICT",
          [],
          await latestDraftConflict(transaction, product.id),
        );
      }

      await transaction.productDraftSpecificationValue.deleteMany({
        where: { productId: product.id },
      });
      await transaction.productDraftReference.deleteMany({
        where: { productId: product.id },
      });
      await transaction.productDraftSpecificationValue.createMany({
        data: specificationCreateData(product.id, specifications),
      });
      if (references.length > 0) {
        await transaction.productDraftReference.createMany({
          data: references.map((reference) => ({
            ...reference,
            productId: product.id,
          })),
        });
      }

      return {
        updatedAt: now,
        version: expectedDraftVersion + 1,
      };
    },
    { isolationLevel: "ReadCommitted" },
  );
}

export async function restoreProductPublication({
  actor,
  expectedDraftVersion,
  now = new Date(),
  partNumber,
  prisma = getApplicationPrisma(),
  publicationId,
}: {
  actor: AdminActor;
  expectedDraftVersion: number;
  now?: Date;
  partNumber: string;
  prisma?: ApplicationDatabase;
  publicationId: string;
}) {
  assertCanManageProducts(actor);

  return prisma.$transaction(
    async (transaction) => {
      const product = await transaction.product.findUnique({
        select: { categoryId: true, id: true },
        where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
      });
      const draft = product
        ? await transaction.productDraft.findUnique({
            select: { version: true },
            where: { productId: product.id },
          })
        : null;

      if (!product || !draft) {
        throw new ProductPublishingError("NOT_FOUND");
      }

      if (draft.version !== expectedDraftVersion) {
        throw new ProductPublishingError(
          "CONFLICT",
          [],
          await latestDraftConflict(transaction, product.id),
        );
      }

      const publicationRecord = await transaction.productPublication.findFirst({
        where: { id: publicationId, productId: product.id },
      });

      if (!publicationRecord) {
        throw new ProductPublishingError("NOT_FOUND");
      }

      const specificationValues =
        await transaction.productSpecificationValue.findMany({
          where: { publicationId: publicationRecord.id },
        });
      const references = await transaction.productReference.findMany({
        where: { publicationId: publicationRecord.id },
      });
      const fitments = await transaction.productFitment.findMany({
        where: { publicationId: publicationRecord.id },
      });
      const publication = {
        ...publicationRecord,
        fitments,
        references,
        specificationValues,
      };

      if (publication.productId !== product.id) {
        throw new ProductPublishingError("NOT_FOUND");
      }

      const update = await transaction.productDraft.updateMany({
        data: {
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
          lastModifiedByUserId: actor.id,
          nameEn: publication.nameEn,
          nameZhCn: publication.nameZhCn,
          replacementProductId: publication.replacementProductId,
          restoredFromPublicationId: publication.id,
          seoDescriptionEn: publication.seoDescriptionEn,
          seoDescriptionZhCn: publication.seoDescriptionZhCn,
          seoTitleEn: publication.seoTitleEn,
          seoTitleZhCn: publication.seoTitleZhCn,
          slugEn: publication.slugEn,
          slugZhCn: publication.slugZhCn,
          status: publication.status,
          summaryEn: publication.summaryEn,
          summaryZhCn: publication.summaryZhCn,
          updatedAt: now,
          version: { increment: 1 },
        },
        where: { productId: product.id, version: expectedDraftVersion },
      });

      if (update.count !== 1) {
        throw new ProductPublishingError(
          "CONFLICT",
          [],
          await latestDraftConflict(transaction, product.id),
        );
      }

      await transaction.productDraftSpecificationValue.deleteMany({
        where: { productId: product.id },
      });
      await transaction.productDraftReference.deleteMany({
        where: { productId: product.id },
      });
      await transaction.productDraftFitment.deleteMany({
        where: { productId: product.id },
      });
      if (publication.specificationValues.length > 0) {
        await transaction.productDraftSpecificationValue.createMany({
          data: specificationCreateData(
            product.id,
            publication.specificationValues,
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
      await transaction.auditLog.create({
        data: {
          actorRole: actor.role,
          actorUserId: actor.id,
          createdAt: now,
          event: "PRODUCT_PUBLICATION_RESTORED",
          outcome: "SUCCESS",
          summary: `公开版本 v${publication.version} 已恢复为草稿 v${expectedDraftVersion + 1}；当前公开版本未改变。`,
          targetId: product.id,
          targetType: "PRODUCT",
        },
      });

      return {
        restoredFromPublicationId: publication.id,
        updatedAt: now,
        version: expectedDraftVersion + 1,
      };
    },
    { isolationLevel: "ReadCommitted" },
  );
}

export async function deleteNeverPublishedProductDraft({
  actor,
  expectedDraftVersion,
  partNumber,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  expectedDraftVersion: number;
  partNumber: string;
  prisma?: ApplicationDatabase;
}) {
  assertCanManageProducts(actor);

  return prisma.$transaction(
    async (transaction) => {
      const product = await transaction.product.findUnique({
        select: {
          _count: {
            select: {
              draftReplacements: true,
              inquiries: true,
              inquirySubmissions: true,
              publicationReplacements: true,
              publications: true,
              quarantinedInquiries: true,
              replacedProducts: true,
            },
          },
          currentPublicationId: true,
          draft: { select: { version: true } },
          id: true,
          partNumber: true,
        },
        where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
      });

      if (!product?.draft) {
        throw new ProductPublishingError("NOT_FOUND");
      }

      if (product.draft.version !== expectedDraftVersion) {
        throw new ProductPublishingError(
          "CONFLICT",
          [],
          await latestDraftConflict(transaction, product.id),
        );
      }

      const auditHistoryCount = await transaction.auditLog.count({
        where: { targetId: product.id, targetType: "PRODUCT" },
      });
      const hasReferencesOrHistory =
        product.currentPublicationId !== null ||
        auditHistoryCount > 0 ||
        Object.values(product._count).some((count) => count > 0);

      if (hasReferencesOrHistory) {
        throw new ProductPublishingError("HARD_DELETE_FORBIDDEN");
      }

      const draftDelete = await transaction.productDraft.deleteMany({
        where: { productId: product.id, version: expectedDraftVersion },
      });
      if (draftDelete.count !== 1) {
        throw new ProductPublishingError("CONFLICT");
      }
      await transaction.product.delete({ where: { id: product.id } });

      return { deletedPartNumber: product.partNumber };
    },
    { isolationLevel: "ReadCommitted" },
  );
}

function normalizeBatchSelections(
  selections: ProductPublishingBatchSelection[],
): ProductPublishingBatchSelection[] {
  if (selections.length === 0 || selections.length > 100) {
    throw new ProductBatchPublishingError("INVALID_SELECTION");
  }

  const normalized = selections.map(({ expectedDraftVersion, partNumber }) => ({
    expectedDraftVersion,
    partNumber: partNumber.trim(),
  }));
  if (
    normalized.some(
      ({ expectedDraftVersion, partNumber }) =>
        !partNumber ||
        !Number.isInteger(expectedDraftVersion) ||
        expectedDraftVersion < 1,
    )
  ) {
    throw new ProductBatchPublishingError("INVALID_SELECTION");
  }
  const keys = normalized.map(({ partNumber }) =>
    normalizeProductNumber(partNumber),
  );
  if (new Set(keys).size !== keys.length) {
    throw new ProductBatchPublishingError("INVALID_SELECTION");
  }

  return normalized.sort((left, right) =>
    normalizeProductNumber(left.partNumber).localeCompare(
      normalizeProductNumber(right.partNumber),
    ),
  );
}

async function loadValidatedProductDraft(
  transaction: Prisma.TransactionClient,
  { expectedDraftVersion, partNumber }: ProductPublishingBatchSelection,
) {
  const product = await transaction.product.findUnique({
    select: { id: true, partNumber: true, status: true },
    where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
  });
  if (!product) throw new ProductPublishingError("NOT_FOUND");

  const [draftRecord, specificationValues, references, fitments] =
    await Promise.all([
      transaction.productDraft.findUnique({ where: { productId: product.id } }),
      transaction.productDraftSpecificationValue.findMany({
        where: { productId: product.id },
      }),
      transaction.productDraftReference.findMany({
        where: { productId: product.id },
      }),
      transaction.productDraftFitment.findMany({
        where: { productId: product.id },
      }),
    ]);
  if (!draftRecord) throw new ProductPublishingError("NOT_FOUND");
  const draft = { ...draftRecord, fitments, references, specificationValues };

  if (draft.version !== expectedDraftVersion) {
    throw new ProductPublishingError(
      "CONFLICT",
      [],
      await latestDraftConflict(transaction, product.id),
    );
  }
  if (draft.lastPublishedVersion === draft.version) {
    throw new ProductPublishingError("NOTHING_TO_PUBLISH");
  }

  const fieldErrors: ProductPublishingFieldError[] = [];
  for (const field of requiredTextFields) {
    if (draft[field].trim().length === 0) {
      fieldErrors.push({ field, message: "此公开字段为必填项。" });
    }
  }
  for (const [field, value] of [
    ["descriptionEn", draft.descriptionEn],
    ["descriptionZhCn", draft.descriptionZhCn],
  ] as const) {
    const richText = validateRestrictedRichText(value);
    if (!richText.success) {
      fieldErrors.push(
        ...richText.issues.map((message) => ({ field, message })),
      );
    }
  }
  if (draft.references.length === 0) {
    fieldErrors.push({ field: "references", message: "至少需要一个参考号。" });
  }
  if (draft.imageAssetId) {
    const imageAsset = await transaction.asset.findUnique({
      select: { imageAltEn: true, imageAltZhCn: true, kind: true },
      where: { id: draft.imageAssetId },
    });
    if (
      imageAsset?.kind !== "image" ||
      !imageAsset.imageAltEn?.trim() ||
      !imageAsset.imageAltZhCn?.trim()
    ) {
      fieldErrors.push({
        field: "imageAssetId",
        message: "图片素材必须存在并包含中英文替代文本。",
      });
    }
  }
  if (draft.documentAssetId) {
    const documentAsset = await transaction.asset.findUnique({
      select: { kind: true },
      where: { id: draft.documentAssetId },
    });
    if (documentAsset?.kind !== "document") {
      fieldErrors.push({
        field: "documentAssetId",
        message: "产品资料必须引用有效的 PDF 素材。",
      });
    }
  }

  let validatedSpecifications: SpecificationSnapshotValue[] = [];
  try {
    validatedSpecifications = await validateProductSpecificationsForCategory(
      transaction,
      {
        categoryId: draft.categoryId,
        values: draft.specificationValues.map(specificationInputFromSnapshot),
      },
    );
  } catch {
    fieldErrors.push({
      field: "specifications",
      message: "规格值未通过当前分类、类型、单位或范围校验。",
    });
  }
  if (fieldErrors.length > 0) {
    throw new ProductPublishingError("PUBLISH_VALIDATION_FAILED", fieldErrors);
  }

  return { draft, product, validatedSpecifications };
}

type ValidatedProductDraft = Awaited<
  ReturnType<typeof loadValidatedProductDraft>
>;

async function validatePublishingReplacement(
  transaction: Prisma.TransactionClient,
  { draft, product }: ValidatedProductDraft,
  { validateCycle = true }: { validateCycle?: boolean } = {},
) {
  await resolveReplacementProduct(transaction, {
    graph: "published",
    productId: product.id,
    replacementPartNumber:
      draft.replacementProductId === null
        ? null
        : (
            await transaction.product.findUniqueOrThrow({
              select: { partNumber: true },
              where: { id: draft.replacementProductId },
            })
          ).partNumber,
    status: draft.status as ProductDraftInput["status"],
    validateCycle,
  });
}

async function findBatchReplacementCycleProductIds(
  transaction: Prisma.TransactionClient,
  loadedDrafts: ValidatedProductDraft[],
): Promise<Set<string>> {
  const nextProductIdById = new Map(
    (
      await transaction.product.findMany({
        select: {
          currentPublication: { select: { replacementProductId: true } },
          id: true,
        },
      })
    ).map(({ currentPublication, id }) => [
      id,
      currentPublication?.replacementProductId ?? null,
    ]),
  );
  for (const { draft, product } of loadedDrafts) {
    nextProductIdById.set(product.id, draft.replacementProductId);
  }

  const productIdsWithCycles = new Set<string>();
  for (const { product } of loadedDrafts) {
    const visited = new Set<string>();
    let candidateId: string | null = product.id;
    while (candidateId) {
      if (visited.has(candidateId)) {
        productIdsWithCycles.add(product.id);
        break;
      }
      visited.add(candidateId);
      candidateId = nextProductIdById.get(candidateId) ?? null;
    }
  }
  return productIdsWithCycles;
}

const batchReplacementCycleFieldError: ProductPublishingFieldError = {
  field: "replacementPartNumber",
  message: "所选草稿的最终替代关系不能形成循环。",
  reason: "REPLACEMENT_CYCLE",
};

async function publishValidatedProductDraft(
  transaction: Prisma.TransactionClient,
  {
    actor,
    expectedDraftVersion,
    loaded,
    now,
  }: {
    actor: AdminActor;
    expectedDraftVersion: number;
    loaded: ValidatedProductDraft;
    now: Date;
  },
) {
  const { draft, product, validatedSpecifications } = loaded;
  const productStatusLabels = {
    discontinued: "已停产",
    draft: "草稿",
    published: "已发布",
  } as const;
  const statusTransition =
    product.status === draft.status
      ? ""
      : `；公开状态从${productStatusLabels[product.status]}变更为${productStatusLabels[draft.status]}`;
  const publishClaim = await transaction.productDraft.updateMany({
    data: { lastPublishedVersion: draft.version, updatedAt: draft.updatedAt },
    where: {
      OR: [
        { lastPublishedVersion: null },
        { lastPublishedVersion: { not: draft.version } },
      ],
      productId: product.id,
      version: expectedDraftVersion,
    },
  });
  if (publishClaim.count !== 1) {
    throw new ProductPublishingError("NOTHING_TO_PUBLISH");
  }

  const latestPublication = await transaction.productPublication.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
    where: { productId: product.id },
  });
  const nextPublicationVersion = (latestPublication?.version ?? 0) + 1;
  const publicationId = `publication-${product.id}-${randomUUID()}`;
  await transaction.productPublication.create({
    data: {
      categoryId: draft.categoryId,
      descriptionEn: draft.descriptionEn,
      descriptionZhCn: draft.descriptionZhCn,
      documentAssetId: draft.documentAssetId,
      fitmentSummaryEn: draft.fitmentSummaryEn,
      fitmentSummaryZhCn: draft.fitmentSummaryZhCn,
      id: publicationId,
      imageAltEn: draft.imageAltEn,
      imageAltZhCn: draft.imageAltZhCn,
      imageAssetId: draft.imageAssetId,
      imagePath: draft.imagePath,
      nameEn: draft.nameEn,
      nameZhCn: draft.nameZhCn,
      productId: product.id,
      publishedAt: now,
      publishedByUserId: actor.id,
      replacementProductId: draft.replacementProductId,
      restoredFromPublicationId: draft.restoredFromPublicationId,
      seoDescriptionEn: draft.seoDescriptionEn,
      seoDescriptionZhCn: draft.seoDescriptionZhCn,
      seoTitleEn: draft.seoTitleEn,
      seoTitleZhCn: draft.seoTitleZhCn,
      slugEn: draft.slugEn,
      slugZhCn: draft.slugZhCn,
      sourceDraftVersion: draft.version,
      status: draft.status,
      summaryEn: draft.summaryEn,
      summaryZhCn: draft.summaryZhCn,
      version: nextPublicationVersion,
    },
  });
  if (draft.specificationValues.length > 0) {
    await transaction.productSpecificationValue.createMany({
      data: publicationSpecificationCreateData(
        publicationId,
        validatedSpecifications,
      ),
    });
  }
  await transaction.productReference.createMany({
    data: draft.references.map(({ brand, referenceNumber }) => ({
      brand,
      id: randomUUID(),
      publicationId,
      referenceNumber,
    })),
  });
  if (draft.fitments.length > 0) {
    await transaction.productFitment.createMany({
      data: draft.fitments.map(
        ({ engineId, vehicleModelId, yearFrom, yearTo }) => ({
          engineId,
          id: randomUUID(),
          publicationId,
          vehicleModelId,
          yearFrom,
          yearTo,
        }),
      ),
    });
  }
  await transaction.productPublication.update({
    data: { sealedAt: now },
    where: { id: publicationId },
  });
  await transaction.product.update({
    data: {
      categoryId: draft.categoryId,
      currentPublicationId: publicationId,
      imagePath: draft.imagePath,
      replacementProductId: draft.replacementProductId,
      status: draft.status,
    },
    where: { id: product.id },
  });
  await transaction.auditLog.create({
    data: {
      actorRole: actor.role,
      actorUserId: actor.id,
      createdAt: now,
      event: "PRODUCT_PUBLISHED",
      outcome: "SUCCESS",
      summary: `草稿 v${draft.version} 形成不可变公开版本 v${nextPublicationVersion}${statusTransition}。`,
      targetId: product.id,
      targetType: "PRODUCT",
    },
  });

  return {
    partNumber: product.partNumber,
    publicationId,
    publishedAt: now,
    version: nextPublicationVersion,
  };
}

function previewItemFromPublishingError(
  selection: ProductPublishingBatchSelection,
  error: ProductPublishingError,
): ProductPublishingBatchItemPreview {
  const status: ProductPublishingBatchItemPreview["status"] =
    error.code === "CONFLICT"
      ? "conflict"
      : error.code === "NOTHING_TO_PUBLISH"
        ? "already_published"
        : error.code === "NOT_FOUND"
          ? "not_found"
          : "invalid";
  return {
    expectedDraftVersion: selection.expectedDraftVersion,
    fieldErrors: error.fieldErrors,
    nameZhCn: null,
    partNumber: selection.partNumber,
    status,
  };
}

export async function previewProductPublishingBatch({
  actor,
  prisma = getApplicationPrisma(),
  selections,
}: {
  actor: AdminActor;
  prisma?: ApplicationDatabase;
  selections: ProductPublishingBatchSelection[];
}): Promise<ProductPublishingBatchPreview> {
  assertCanManageProducts(actor);
  const normalizedSelections = normalizeBatchSelections(selections);

  return prisma.$transaction(async (transaction) => {
    const items: ProductPublishingBatchItemPreview[] = [];
    const loadedDrafts: ValidatedProductDraft[] = [];
    for (const selection of normalizedSelections) {
      try {
        const loaded = await loadValidatedProductDraft(transaction, selection);
        await validatePublishingReplacement(transaction, loaded, {
          validateCycle: false,
        });
        loadedDrafts.push(loaded);
        items.push({
          expectedDraftVersion: selection.expectedDraftVersion,
          fieldErrors: [],
          nameZhCn: loaded.draft.nameZhCn,
          partNumber: loaded.product.partNumber,
          status: "ready",
        });
      } catch (error) {
        if (!(error instanceof ProductPublishingError)) throw error;
        items.push(previewItemFromPublishingError(selection, error));
      }
    }
    const productIdsWithCycles = await findBatchReplacementCycleProductIds(
      transaction,
      loadedDrafts,
    );
    for (const loaded of loadedDrafts) {
      if (!productIdsWithCycles.has(loaded.product.id)) continue;
      const item = items.find(
        ({ partNumber }) => partNumber === loaded.product.partNumber,
      );
      if (!item) continue;
      item.fieldErrors = [batchReplacementCycleFieldError];
      item.status = "invalid";
    }
    return { allReady: items.every(({ status }) => status === "ready"), items };
  });
}

function batchPublishingErrorCode(error: unknown) {
  if (error instanceof ProductBatchPublishingError) return error.code;
  if (!(error instanceof ProductPublishingError)) return "TRANSACTION_FAILED";
  if (error.code === "FORBIDDEN") return "FORBIDDEN";
  if (error.code === "CONFLICT") return "CONFLICT";
  if (error.code === "NOTHING_TO_PUBLISH") return "NOTHING_TO_PUBLISH";
  return "VALIDATION_FAILED";
}

export async function publishProductDraftBatch({
  actor,
  now = new Date(),
  prisma = getApplicationPrisma(),
  selections,
}: {
  actor: AdminActor;
  now?: Date;
  prisma?: ApplicationDatabase;
  selections: ProductPublishingBatchSelection[];
}) {
  assertCanManageProducts(actor);
  const normalizedSelections = normalizeBatchSelections(selections);
  const publishBatchId = randomUUID();
  const partNumbers = normalizedSelections.map(({ partNumber }) => partNumber);

  try {
    return await prisma.$transaction(
      async (transaction) => {
        for (const selection of normalizedSelections) {
          const normalizedPartNumber = normalizeProductNumber(
            selection.partNumber,
          );
          await transaction.$queryRaw`
            SELECT "id" FROM "product"
            WHERE "normalized_part_number" = ${normalizedPartNumber}
            FOR UPDATE
          `;
        }
        const loadedDrafts: Array<{
          loaded: ValidatedProductDraft;
          selection: ProductPublishingBatchSelection;
        }> = [];
        for (const selection of normalizedSelections) {
          loadedDrafts.push({
            loaded: await loadValidatedProductDraft(transaction, selection),
            selection,
          });
        }

        await lockProductReplacementGraph(transaction);
        for (const { loaded } of loadedDrafts) {
          await validatePublishingReplacement(transaction, loaded, {
            validateCycle: false,
          });
        }
        if (
          (
            await findBatchReplacementCycleProductIds(
              transaction,
              loadedDrafts.map(({ loaded }) => loaded),
            )
          ).size > 0
        ) {
          throw new ProductPublishingError("PUBLISH_VALIDATION_FAILED", [
            batchReplacementCycleFieldError,
          ]);
        }

        const publications = [];
        for (const { loaded, selection } of loadedDrafts) {
          publications.push(
            await publishValidatedProductDraft(transaction, {
              actor,
              expectedDraftVersion: selection.expectedDraftVersion,
              loaded,
              now,
            }),
          );
        }
        await transaction.auditLog.create({
          data: {
            actorRole: actor.role,
            actorUserId: actor.id,
            createdAt: now,
            event: "PRODUCT_BATCH_PUBLISHED",
            outcome: "SUCCESS",
            summary: `已原子发布 ${publications.length} 个产品草稿：${partNumbers.join("、")}。`,
            targetId: publishBatchId,
            targetType: "ProductPublishBatch",
          },
        });
        return {
          batchId: publishBatchId,
          publications,
          publishedCount: publications.length,
        };
      },
      { isolationLevel: "ReadCommitted" },
    );
  } catch (error) {
    const code = batchPublishingErrorCode(error);
    const preview = await previewProductPublishingBatch({
      actor,
      prisma,
      selections: normalizedSelections,
    });
    await prisma.auditLog.create({
      data: {
        actorRole: actor.role,
        actorUserId: actor.id,
        createdAt: now,
        event: "PRODUCT_BATCH_PUBLISH_REJECTED",
        outcome:
          code === "CONFLICT"
            ? "CONFLICT"
            : code === "NOTHING_TO_PUBLISH"
              ? "DUPLICATE"
              : code === "VALIDATION_FAILED"
                ? "VALIDATION"
                : "FAILURE",
        summary: `批量发布未执行（${code}）：${partNumbers.join("、")}。`,
        targetId: publishBatchId,
        targetType: "ProductPublishBatch",
      },
    });
    throw new ProductBatchPublishingError(code, preview);
  }
}

export async function publishProductDraft({
  actor,
  expectedDraftVersion,
  now = new Date(),
  partNumber,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  expectedDraftVersion: number;
  now?: Date;
  partNumber: string;
  prisma?: ApplicationDatabase;
}) {
  assertCanManageProducts(actor);

  return prisma.$transaction(
    async (transaction) => {
      const loaded = await loadValidatedProductDraft(transaction, {
        expectedDraftVersion,
        partNumber,
      });
      await lockProductReplacementGraph(transaction);
      await validatePublishingReplacement(transaction, loaded);
      const { partNumber: ignoredPartNumber, ...published } =
        await publishValidatedProductDraft(transaction, {
          actor,
          expectedDraftVersion,
          loaded,
          now,
        });
      void ignoredPartNumber;
      return published;
    },
    { isolationLevel: "ReadCommitted" },
  );
}

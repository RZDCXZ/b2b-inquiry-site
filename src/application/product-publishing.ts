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
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

export type ProductPublishingFieldError = {
  field: string;
  message: string;
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
    productId,
    replacementPartNumber,
    status,
  }: {
    productId: string;
    replacementPartNumber: string | null;
    status: ProductDraftInput["status"];
  },
) {
  if (status !== "discontinued" && replacementPartNumber) {
    throw new ProductPublishingError("INVALID_DRAFT", [
      {
        field: "replacementPartNumber",
        message: "只有已停产产品可以设置替代产品。",
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

  if (
    !replacement ||
    replacement.currentPublication?.status === "draft" ||
    !replacement.currentPublication
  ) {
    throw new ProductPublishingError("INVALID_DRAFT", [
      {
        field: "replacementPartNumber",
        message: "替代产品必须已有公开版本。",
      },
    ]);
  }

  if (replacement.id === productId) {
    throw new ProductPublishingError("INVALID_DRAFT", [
      { field: "replacementPartNumber", message: "产品不能替代自身。" },
    ]);
  }

  const replacementEdges = await prisma.productDraft.findMany({
    select: { productId: true, replacementProductId: true },
  });
  const nextProductIdById = new Map(
    replacementEdges.map(({ productId, replacementProductId }) => [
      productId,
      replacementProductId,
    ]),
  );
  const visited = new Set<string>();
  let candidateId: string | null = replacement.id;

  while (candidateId) {
    if (candidateId === productId || visited.has(candidateId)) {
      throw new ProductPublishingError("INVALID_DRAFT", [
        { field: "replacementPartNumber", message: "替代关系不能形成循环。" },
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
          _count: { select: { fitments: true } },
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

  return {
    ...product.draft,
    currentPublicationId: product.currentPublicationId,
    partNumber: product.partNumber,
    productStatus: product.status,
    publicationReadiness: {
      bilingualContent: languageCompleteness.en && languageCompleteness.zhCn,
      image: product.draft.imagePath.trim().length > 0,
      references: product.draft.references.length > 0,
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
      currentPublicationId: true,
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
          references: { select: { id: true } },
          seoDescriptionEn: true,
          seoDescriptionZhCn: true,
          seoTitleEn: true,
          seoTitleZhCn: true,
          slugEn: true,
          slugZhCn: true,
          specificationValues: { select: { attributeId: true } },
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
      const replacement = await resolveReplacementProduct(transaction, {
        productId: product.id,
        replacementPartNumber: input.replacementPartNumber,
        status: input.status,
      });

      const update = await transaction.productDraft.updateMany({
        data: {
          categoryId: input.categoryId,
          descriptionEn: input.descriptionEn.trim(),
          descriptionZhCn: input.descriptionZhCn.trim(),
          fitmentSummaryEn: input.fitmentSummaryEn.trim(),
          fitmentSummaryZhCn: input.fitmentSummaryZhCn.trim(),
          imageAltEn: input.imageAltEn.trim(),
          imageAltZhCn: input.imageAltZhCn.trim(),
          imagePath: input.imagePath.trim(),
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
          imagePath: publication.imagePath,
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
      const product = await transaction.product.findUnique({
        select: { id: true },
        where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
      });

      if (!product) {
        throw new ProductPublishingError("NOT_FOUND");
      }

      const draftRecord = await transaction.productDraft.findUnique({
        where: { productId: product.id },
      });
      if (!draftRecord) {
        throw new ProductPublishingError("NOT_FOUND");
      }
      const specificationValues =
        await transaction.productDraftSpecificationValue.findMany({
          where: { productId: product.id },
        });
      const references = await transaction.productDraftReference.findMany({
        where: { productId: product.id },
      });
      const fitments = await transaction.productDraftFitment.findMany({
        where: { productId: product.id },
      });
      const draft = {
        ...draftRecord,
        fitments,
        references,
        specificationValues,
      };
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

      if (draft.references.length === 0) {
        fieldErrors.push({
          field: "references",
          message: "至少需要一个参考号。",
        });
      }

      let validatedSpecifications: SpecificationSnapshotValue[] = [];
      try {
        validatedSpecifications =
          await validateProductSpecificationsForCategory(transaction, {
            categoryId: draft.categoryId,
            values: draft.specificationValues.map(
              specificationInputFromSnapshot,
            ),
          });
      } catch {
        fieldErrors.push({
          field: "specifications",
          message: "规格值未通过当前分类、类型、单位或范围校验。",
        });
      }

      if (fieldErrors.length > 0) {
        throw new ProductPublishingError(
          "PUBLISH_VALIDATION_FAILED",
          fieldErrors,
        );
      }

      await resolveReplacementProduct(transaction, {
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
      });

      const publishClaim = await transaction.productDraft.updateMany({
        data: {
          lastPublishedVersion: draft.version,
          updatedAt: draft.updatedAt,
        },
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
          fitmentSummaryEn: draft.fitmentSummaryEn,
          fitmentSummaryZhCn: draft.fitmentSummaryZhCn,
          id: publicationId,
          imageAltEn: draft.imageAltEn,
          imageAltZhCn: draft.imageAltZhCn,
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
          summary: `草稿 v${draft.version} 形成不可变公开版本 v${nextPublicationVersion}。`,
          targetId: product.id,
          targetType: "PRODUCT",
        },
      });

      return {
        publicationId,
        publishedAt: now,
        version: nextPublicationVersion,
      };
    },
    { isolationLevel: "ReadCommitted" },
  );
}

import { createHash, randomUUID } from "node:crypto";

import { z } from "zod";

import type { Prisma } from "@/src/generated/prisma/client";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import { normalizeProductNumber } from "@/src/modules/catalog/public/product-identity";
import {
  formatProductImportBatchNumber,
  type ProductImportChange,
  type ProductImportError as ProductImportIssue,
  type ProductImportPayload,
  type ProductImportPayloadProduct,
  type ProductImportPreviewView,
  PRODUCT_IMPORT_SHEETS,
} from "@/src/modules/catalog/public/product-import";
import {
  cyclicProductImportReplacementNumbers,
  createProductImportErrorWorkbook,
  createProductImportWorkbook,
  parseProductImportWorkbook,
  productImportCatalogFingerprint,
  productImportReplacementGraphFingerprint,
  type ProductImportCatalogContext,
  type ProductImportFile,
} from "@/src/modules/catalog/server/product-import-workbook";
import { lockProductReplacementGraph } from "@/src/modules/catalog/server/product-replacement-graph";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";

export { PRODUCT_IMPORT_SHEETS };
export { PRODUCT_IMPORT_XLSX_MIME } from "@/src/modules/catalog/server/product-import-workbook";

export class ProductImportError extends Error {
  constructor(
    readonly code:
      | "ALREADY_ROLLED_BACK"
      | "ALREADY_CONFIRMED"
      | "FORBIDDEN"
      | "HAS_VALIDATION_ERRORS"
      | "NOT_FOUND"
      | "PREVIEW_STALE"
      | "ROLLBACK_CONFLICT"
      | "SNAPSHOT_UNAVAILABLE",
    readonly conflicts: ProductImportRollbackConflict[] = [],
  ) {
    super(code);
    this.name = "ProductImportError";
  }
}

export type ProductImportRollbackConflictReason =
  | "BUSINESS_HISTORY_AFTER_IMPORT"
  | "DRAFT_MISSING"
  | "MODIFIED_AFTER_IMPORT"
  | "PUBLISHED_AFTER_IMPORT";

export type ProductImportRollbackConflict = {
  lastModifiedAt: Date | null;
  lastModifiedBy: string;
  partNumber: string;
  reasons: ProductImportRollbackConflictReason[];
};

function assertCanManageImports(actor: AdminActor) {
  if (
    actor.role !== APP_ROLES.ADMINISTRATOR &&
    actor.role !== APP_ROLES.CONTENT_EDITOR
  ) {
    throw new ProductImportError("FORBIDDEN");
  }
}

const importIssueSchema = z.object({
  code: z.string(),
  field: z.string(),
  issue: z.string(),
  row: z.number(),
  sheet: z.string(),
  suggestion: z.string(),
});

const translationPayloadSchema = z.object({
  description: z.string(),
  fitmentSummary: z.string(),
  imageAlt: z.string(),
  name: z.string(),
  seoDescription: z.string(),
  seoTitle: z.string(),
  slug: z.string(),
  summary: z.string(),
});

const specificationPayloadSchema = z.object({
  attributeCode: z.string(),
  attributeId: z.string(),
  baseUnit: z
    .enum([
      "cubic_metre_per_minute",
      "kilopascal",
      "litre_per_minute",
      "micrometre",
      "millimetre",
    ])
    .nullable(),
  booleanValue: z.boolean().nullable(),
  dataType: z.enum(["boolean", "decimal", "enumeration", "text"]),
  decimalValue: z.number().nullable(),
  enumerationLabelEn: z.string().nullable(),
  enumerationLabelZhCn: z.string().nullable(),
  enumerationValue: z.string().nullable(),
  nameEn: z.string(),
  nameZhCn: z.string(),
  position: z.number().int().positive(),
  textValue: z.string().nullable(),
});

const payloadSchema = z.object({
  catalogFingerprint: z.string().length(64),
  products: z.array(
    z.object({
      baselineCurrentPublicationId: z.string().nullable(),
      baselineDraftVersion: z.number().int().positive().nullable(),
      baselineLastPublishedVersion: z.number().int().positive().nullable(),
      baselineNameZhCn: z.string().nullable(),
      baselineProductId: z.string().nullable(),
      categoryId: z.string(),
      categoryNameZhCn: z.string(),
      changeKind: z.enum(["add", "update"]),
      changes: z.array(
        z.object({
          after: z.string(),
          before: z.string(),
          field: z.string(),
        }),
      ),
      fitments: z.array(
        z.object({
          engineId: z.string(),
          vehicleModelId: z.string(),
          yearFrom: z.number().int(),
          yearTo: z.number().int(),
        }),
      ),
      imagePath: z.string(),
      partNumber: z.string(),
      references: z.array(
        z.object({ brand: z.string(), referenceNumber: z.string() }),
      ),
      replacementBaselineCurrentPublicationId: z
        .string()
        .nullable()
        .default(null),
      replacementBaselineProductId: z.string().nullable().default(null),
      replacementPartNumber: z.string().nullable(),
      specifications: z.array(specificationPayloadSchema),
      status: z.enum(["discontinued", "published"]),
      translations: z.object({
        en: translationPayloadSchema,
        zhCn: translationPayloadSchema,
      }),
    }),
  ),
  replacementGraphFingerprint: z.string().length(64).default(""),
});

const draftSnapshotSchema = z.object({
  draft: z.object({
    categoryId: z.string(),
    descriptionEn: z.string(),
    descriptionZhCn: z.string(),
    documentAssetId: z.string().nullable(),
    fitmentSummaryEn: z.string(),
    fitmentSummaryZhCn: z.string(),
    imageAltEn: z.string(),
    imageAltZhCn: z.string(),
    imageAssetId: z.string().nullable(),
    imagePath: z.string(),
    lastModifiedByUserId: z.string().nullable(),
    lastPublishedVersion: z.number().int().positive().nullable(),
    nameEn: z.string(),
    nameZhCn: z.string(),
    replacementProductId: z.string().nullable(),
    restoredFromPublicationId: z.string().nullable(),
    seoDescriptionEn: z.string(),
    seoDescriptionZhCn: z.string(),
    seoTitleEn: z.string(),
    seoTitleZhCn: z.string(),
    slugEn: z.string(),
    slugZhCn: z.string(),
    status: z.enum(["draft", "published", "discontinued"]),
    summaryEn: z.string(),
    summaryZhCn: z.string(),
    updatedAt: z.string().datetime(),
    version: z.number().int().positive(),
  }),
  fitments: z.array(
    z.object({
      engineId: z.string(),
      vehicleModelId: z.string(),
      yearFrom: z.number().int(),
      yearTo: z.number().int(),
    }),
  ),
  references: z.array(
    z.object({ brand: z.string(), referenceNumber: z.string() }),
  ),
  specificationValues: z.array(
    z.object({
      attributeCode: z.string(),
      attributeId: z.string(),
      baseUnit: z
        .enum([
          "cubic_metre_per_minute",
          "kilopascal",
          "litre_per_minute",
          "micrometre",
          "millimetre",
        ])
        .nullable(),
      booleanValue: z.boolean().nullable(),
      dataType: z.enum(["boolean", "decimal", "enumeration", "text"]),
      decimalValue: z.string().nullable(),
      enumerationLabelEn: z.string().nullable(),
      enumerationLabelZhCn: z.string().nullable(),
      enumerationValue: z.string().nullable(),
      nameEn: z.string(),
      nameZhCn: z.string(),
      position: z.number().int().positive(),
      textValue: z.string().nullable(),
    }),
  ),
});

type ProductDraftSnapshot = z.infer<typeof draftSnapshotSchema>;

async function captureProductDraftSnapshot(
  prisma: Pick<
    Prisma.TransactionClient,
    | "productDraft"
    | "productDraftFitment"
    | "productDraftReference"
    | "productDraftSpecificationValue"
  >,
  productId: string,
): Promise<ProductDraftSnapshot | null> {
  const [draft, fitments, references, specificationValues] = await Promise.all([
    prisma.productDraft.findUnique({ where: { productId } }),
    prisma.productDraftFitment.findMany({
      orderBy: [
        { vehicleModelId: "asc" },
        { engineId: "asc" },
        { yearFrom: "asc" },
        { yearTo: "asc" },
      ],
      select: {
        engineId: true,
        vehicleModelId: true,
        yearFrom: true,
        yearTo: true,
      },
      where: { productId },
    }),
    prisma.productDraftReference.findMany({
      orderBy: [{ brand: "asc" }, { referenceNumber: "asc" }],
      select: { brand: true, referenceNumber: true },
      where: { productId },
    }),
    prisma.productDraftSpecificationValue.findMany({
      orderBy: { position: "asc" },
      where: { productId },
    }),
  ]);

  if (!draft) return null;
  const { productId: ignoredProductId, updatedAt, ...draftValues } = draft;
  void ignoredProductId;

  return draftSnapshotSchema.parse({
    draft: { ...draftValues, updatedAt: updatedAt.toISOString() },
    fitments,
    references,
    specificationValues: specificationValues.map(
      ({
        decimalValue,
        productId: ignoredSpecificationProductId,
        ...value
      }) => {
        void ignoredSpecificationProductId;
        return {
          ...value,
          decimalValue: decimalValue?.toString() ?? null,
        };
      },
    ),
  });
}

function readErrors(value: Prisma.JsonValue): ProductImportIssue[] {
  return z.array(importIssueSchema).parse(value) as ProductImportIssue[];
}

function readPayload(value: Prisma.JsonValue): ProductImportPayload {
  return payloadSchema.parse(value) as ProductImportPayload;
}

function previewView(preview: {
  addedCount: number;
  affectedProductCount: number;
  createdAt: Date;
  errors: Prisma.JsonValue;
  id: string;
  originalFilename: string;
  payload: Prisma.JsonValue;
  status: string;
  updatedCount: number;
}): ProductImportPreviewView {
  const errors = readErrors(preview.errors);
  return {
    addedCount: preview.addedCount,
    affectedProductCount: preview.affectedProductCount,
    canConfirm: errors.length === 0 && preview.status === "pending",
    createdAt: preview.createdAt,
    errors,
    id: preview.id,
    originalFilename: preview.originalFilename,
    products: readPayload(preview.payload).products,
    status: preview.status === "confirmed" ? "confirmed" : "pending",
    updatedCount: preview.updatedCount,
  };
}

export async function createProductImportTemplate(): Promise<Uint8Array> {
  return createProductImportWorkbook();
}

async function loadProductImportCatalogContext(
  prisma: Pick<
    Prisma.TransactionClient,
    "engine" | "product" | "productCategory"
  >,
): Promise<ProductImportCatalogContext> {
  const [categories, engines, existingProducts] = await Promise.all([
    prisma.productCategory.findMany({
      select: {
        code: true,
        id: true,
        nameZhCn: true,
        specificationAttributes: {
          include: { options: { orderBy: { position: "asc" } } },
          orderBy: { position: "asc" },
        },
      },
    }),
    prisma.engine.findMany({
      select: {
        code: true,
        id: true,
        vehicleModel: {
          select: { id: true, make: { select: { name: true } }, name: true },
        },
      },
    }),
    prisma.product.findMany({
      select: {
        currentPublicationId: true,
        draft: {
          select: {
            lastPublishedVersion: true,
            nameZhCn: true,
            replacementProduct: {
              select: { normalizedPartNumber: true },
            },
            version: true,
          },
        },
        id: true,
        normalizedPartNumber: true,
        partNumber: true,
      },
    }),
  ]);
  return {
    categories: categories.map((category) => ({
      ...category,
      specificationAttributes: category.specificationAttributes.map(
        (definition) => ({
          ...definition,
          maximumDecimalValue:
            definition.maximumDecimalValue?.toNumber() ?? null,
          minimumDecimalValue:
            definition.minimumDecimalValue?.toNumber() ?? null,
        }),
      ),
    })),
    engines: engines.map((engine) => ({
      code: engine.code,
      id: engine.id,
      makeName: engine.vehicleModel.make.name,
      modelName: engine.vehicleModel.name,
      vehicleModelId: engine.vehicleModel.id,
    })),
    existingProducts: existingProducts.map((product) => ({
      currentPublicationId: product.currentPublicationId,
      draftLastPublishedVersion: product.draft?.lastPublishedVersion ?? null,
      draftNameZhCn: product.draft?.nameZhCn ?? null,
      draftReplacementNormalizedPartNumber:
        product.draft?.replacementProduct?.normalizedPartNumber ?? null,
      draftVersion: product.draft?.version ?? null,
      id: product.id,
      normalizedPartNumber: product.normalizedPartNumber,
      partNumber: product.partNumber,
    })),
  };
}

function normalizedDiffText(value: string | null | undefined): string {
  return value?.replaceAll(/\s+/g, " ").trim() || "—";
}

function appendChange(
  changes: ProductImportChange[],
  field: string,
  before: string | null | undefined,
  after: string | null | undefined,
) {
  const normalizedBefore = normalizedDiffText(before);
  const normalizedAfter = normalizedDiffText(after);
  if (normalizedBefore === normalizedAfter) return;
  changes.push({ after: normalizedAfter, before: normalizedBefore, field });
}

function importedSpecificationValue(
  value: ProductImportPayloadProduct["specifications"][number],
): string {
  const scalar =
    value.dataType === "decimal"
      ? String(value.decimalValue)
      : value.dataType === "boolean"
        ? String(value.booleanValue)
        : value.dataType === "enumeration"
          ? (value.enumerationValue ?? "")
          : (value.textValue ?? "");
  return value.baseUnit ? `${scalar} ${value.baseUnit}` : scalar;
}

async function attachProductImportChanges({
  context,
  payload,
  prisma,
}: {
  context: ProductImportCatalogContext;
  payload: ProductImportPayload;
  prisma: Pick<Prisma.TransactionClient, "productDraft">;
}) {
  const productIds = payload.products.flatMap((product) =>
    product.baselineProductId ? [product.baselineProductId] : [],
  );
  if (productIds.length === 0) return;

  const drafts = await prisma.productDraft.findMany({
    select: {
      category: { select: { nameZhCn: true } },
      descriptionEn: true,
      descriptionZhCn: true,
      fitmentSummaryEn: true,
      fitmentSummaryZhCn: true,
      fitments: {
        orderBy: [
          { vehicleModelId: "asc" },
          { engineId: "asc" },
          { yearFrom: "asc" },
        ],
        select: {
          engine: {
            select: {
              code: true,
              vehicleModel: {
                select: {
                  make: { select: { name: true } },
                  name: true,
                },
              },
            },
          },
          yearFrom: true,
          yearTo: true,
        },
      },
      imageAltEn: true,
      imageAltZhCn: true,
      imagePath: true,
      nameEn: true,
      nameZhCn: true,
      productId: true,
      references: {
        orderBy: [{ brand: "asc" }, { normalizedReferenceNumber: "asc" }],
        select: { brand: true, referenceNumber: true },
      },
      replacementProduct: { select: { partNumber: true } },
      seoDescriptionEn: true,
      seoDescriptionZhCn: true,
      seoTitleEn: true,
      seoTitleZhCn: true,
      slugEn: true,
      slugZhCn: true,
      specificationValues: {
        orderBy: { position: "asc" },
        select: {
          attribute: { select: { code: true } },
          baseUnit: true,
          booleanValue: true,
          dataType: true,
          decimalValue: true,
          enumerationValue: true,
          textValue: true,
        },
      },
      status: true,
      summaryEn: true,
      summaryZhCn: true,
    },
    where: { productId: { in: productIds } },
  });
  const draftByProductId = new Map(
    drafts.map((draft) => [draft.productId, draft]),
  );
  const engineById = new Map(
    context.engines.map((engine) => [engine.id, engine]),
  );

  for (const product of payload.products) {
    if (!product.baselineProductId) continue;
    const draft = draftByProductId.get(product.baselineProductId);
    if (!draft) continue;
    const changes: ProductImportChange[] = [];
    appendChange(
      changes,
      "分类",
      draft.category.nameZhCn,
      product.categoryNameZhCn,
    );
    appendChange(changes, "图片路径", draft.imagePath, product.imagePath);
    appendChange(changes, "草稿状态", draft.status, product.status);
    appendChange(
      changes,
      "替代产品编号",
      draft.replacementProduct?.partNumber,
      product.replacementPartNumber,
    );

    const translationFields = [
      ["产品名称", "name", "nameEn", "nameZhCn"],
      ["URL 别名", "slug", "slugEn", "slugZhCn"],
      ["短描述", "summary", "summaryEn", "summaryZhCn"],
      ["详细描述", "description", "descriptionEn", "descriptionZhCn"],
      ["SEO 标题", "seoTitle", "seoTitleEn", "seoTitleZhCn"],
      ["SEO 描述", "seoDescription", "seoDescriptionEn", "seoDescriptionZhCn"],
      ["图片替代文本", "imageAlt", "imageAltEn", "imageAltZhCn"],
      ["适配摘要", "fitmentSummary", "fitmentSummaryEn", "fitmentSummaryZhCn"],
    ] as const;
    for (const [label, key, draftEnKey, draftZhCnKey] of translationFields) {
      appendChange(
        changes,
        `${label}（英文）`,
        draft[draftEnKey],
        product.translations.en[key],
      );
      appendChange(
        changes,
        `${label}（简中）`,
        draft[draftZhCnKey],
        product.translations.zhCn[key],
      );
    }

    const beforeSpecifications = new Map(
      draft.specificationValues.map((value) => {
        const scalar =
          value.dataType === "decimal"
            ? value.decimalValue?.toString()
            : value.dataType === "boolean"
              ? String(value.booleanValue)
              : value.dataType === "enumeration"
                ? value.enumerationValue
                : value.textValue;
        return [
          value.attribute.code,
          value.baseUnit ? `${scalar} ${value.baseUnit}` : (scalar ?? ""),
        ];
      }),
    );
    const afterSpecifications = new Map(
      product.specifications.map((value) => [
        value.attributeCode,
        importedSpecificationValue(value),
      ]),
    );
    for (const attributeCode of [
      ...new Set([
        ...beforeSpecifications.keys(),
        ...afterSpecifications.keys(),
      ]),
    ].sort()) {
      appendChange(
        changes,
        `规格 · ${attributeCode}`,
        beforeSpecifications.get(attributeCode),
        afterSpecifications.get(attributeCode),
      );
    }

    appendChange(
      changes,
      "参考号",
      draft.references
        .map(({ brand, referenceNumber }) => `${brand} · ${referenceNumber}`)
        .join("；"),
      [...product.references]
        .sort(
          (left, right) =>
            left.brand.localeCompare(right.brand) ||
            left.referenceNumber.localeCompare(right.referenceNumber),
        )
        .map(({ brand, referenceNumber }) => `${brand} · ${referenceNumber}`)
        .join("；"),
    );
    appendChange(
      changes,
      "适配关系",
      draft.fitments
        .map(
          ({ engine, yearFrom, yearTo }) =>
            `${engine.vehicleModel.make.name} / ${engine.vehicleModel.name} / ${engine.code} / ${yearFrom}–${yearTo}`,
        )
        .join("；"),
      [...product.fitments]
        .sort(
          (left, right) =>
            left.vehicleModelId.localeCompare(right.vehicleModelId) ||
            left.engineId.localeCompare(right.engineId) ||
            left.yearFrom - right.yearFrom,
        )
        .map((fitment) => {
          const engine = engineById.get(fitment.engineId);
          return `${engine?.makeName ?? fitment.vehicleModelId} / ${engine?.modelName ?? fitment.vehicleModelId} / ${engine?.code ?? fitment.engineId} / ${fitment.yearFrom}–${fitment.yearTo}`;
        })
        .join("；"),
    );
    product.changes = changes;
  }
}

export async function previewProductImport({
  actor,
  file,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  file: ProductImportFile;
  prisma?: ApplicationDatabase;
}): Promise<ProductImportPreviewView> {
  assertCanManageImports(actor);
  const context = await loadProductImportCatalogContext(prisma);
  const result = await parseProductImportWorkbook({
    context,
    file,
  });
  await attachProductImportChanges({
    context,
    payload: result.payload,
    prisma,
  });
  const preview = await prisma.productImportPreview.create({
    data: {
      addedCount: result.summary.addedCount,
      affectedProductCount: result.summary.affectedProductCount,
      createdByUserId: actor.id,
      errors: result.errors as unknown as Prisma.InputJsonValue,
      fileHash: createHash("sha256").update(file.bytes).digest("hex"),
      originalFilename: file.originalFilename,
      payload: result.payload as unknown as Prisma.InputJsonValue,
      updatedCount: result.summary.updatedCount,
    },
  });
  return previewView(preview);
}

export async function getProductImportPreview({
  actor,
  previewId,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  previewId: string;
  prisma?: ApplicationDatabase;
}): Promise<ProductImportPreviewView> {
  assertCanManageImports(actor);
  const preview = await prisma.productImportPreview.findUnique({
    where: { id: previewId },
  });
  if (!preview) throw new ProductImportError("NOT_FOUND");
  return previewView(preview);
}

export async function createProductImportErrorReport({
  actor,
  previewId,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  previewId: string;
  prisma?: ApplicationDatabase;
}): Promise<Uint8Array> {
  const preview = await getProductImportPreview({ actor, previewId, prisma });
  return createProductImportErrorWorkbook(preview.errors);
}

export async function confirmProductImport({
  actor,
  now = new Date(),
  previewId,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  now?: Date;
  previewId: string;
  prisma?: ApplicationDatabase;
}) {
  assertCanManageImports(actor);

  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${previewId}))
      `;
      const preview = await transaction.productImportPreview.findUnique({
        where: { id: previewId },
      });
      if (!preview) throw new ProductImportError("NOT_FOUND");
      if (preview.status !== "pending") {
        throw new ProductImportError("ALREADY_CONFIRMED");
      }
      if (readErrors(preview.errors).length > 0) {
        throw new ProductImportError("HAS_VALIDATION_ERRORS");
      }
      const payload = readPayload(preview.payload);
      await lockProductReplacementGraph(transaction);
      const currentCatalog = await loadProductImportCatalogContext(transaction);
      if (
        productImportCatalogFingerprint(currentCatalog) !==
        payload.catalogFingerprint
      ) {
        throw new ProductImportError("PREVIEW_STALE");
      }
      if (
        !payload.replacementGraphFingerprint ||
        productImportReplacementGraphFingerprint(
          currentCatalog,
          payload.products,
        ) !== payload.replacementGraphFingerprint
      ) {
        throw new ProductImportError("PREVIEW_STALE");
      }
      const currentProductByNumber = new Map(
        currentCatalog.existingProducts.map((product) => [
          product.normalizedPartNumber,
          product,
        ]),
      );
      const productIdByNumber = new Map<string, string>();

      for (const product of payload.products) {
        const normalized = normalizeProductNumber(product.partNumber);
        const current = await transaction.product.findUnique({
          select: {
            currentPublicationId: true,
            draft: {
              select: { lastPublishedVersion: true, version: true },
            },
            id: true,
          },
          where: { normalizedPartNumber: normalized },
        });
        if (
          product.baselineProductId === null
            ? current !== null
            : current?.id !== product.baselineProductId ||
              current.currentPublicationId !==
                product.baselineCurrentPublicationId ||
              current.draft?.lastPublishedVersion !==
                product.baselineLastPublishedVersion ||
              current.draft?.version !== product.baselineDraftVersion
        ) {
          throw new ProductImportError("PREVIEW_STALE");
        }
        if (product.replacementPartNumber) {
          const replacement = currentProductByNumber.get(
            normalizeProductNumber(product.replacementPartNumber),
          );
          if (
            replacement?.id !== product.replacementBaselineProductId ||
            replacement.currentPublicationId !==
              product.replacementBaselineCurrentPublicationId
          ) {
            throw new ProductImportError("PREVIEW_STALE");
          }
        }
        if (current) productIdByNumber.set(normalized, current.id);
      }
      if (
        cyclicProductImportReplacementNumbers(currentCatalog, payload.products)
          .size > 0
      ) {
        throw new ProductImportError("PREVIEW_STALE");
      }

      for (const product of payload.products) {
        if (product.baselineProductId !== null) continue;
        const created = await transaction.product.create({
          data: {
            categoryId: product.categoryId,
            id: `product-import-${randomUUID()}`,
            imagePath: product.imagePath,
            partNumber: product.partNumber,
            status: "draft",
          },
          select: { id: true },
        });
        productIdByNumber.set(
          normalizeProductNumber(product.partNumber),
          created.id,
        );
      }

      const replacementNumbers = payload.products.flatMap((product) =>
        product.replacementPartNumber
          ? [normalizeProductNumber(product.replacementPartNumber)]
          : [],
      );
      if (replacementNumbers.length > 0) {
        const replacements = await transaction.product.findMany({
          select: { id: true, normalizedPartNumber: true },
          where: { normalizedPartNumber: { in: replacementNumbers } },
        });
        for (const replacement of replacements) {
          productIdByNumber.set(
            replacement.normalizedPartNumber,
            replacement.id,
          );
        }
        if (
          replacementNumbers.some((number) => !productIdByNumber.has(number))
        ) {
          throw new ProductImportError("PREVIEW_STALE");
        }
      }

      const imported: Array<{
        afterDraftVersion: number;
        afterDraftSnapshot: ProductDraftSnapshot;
        beforeDraftVersion: number | null;
        beforeDraftSnapshot: ProductDraftSnapshot | null;
        partNumber: string;
        publicationIdAtImport: string | null;
        productId: string;
        productWasCreated: boolean;
      }> = [];
      for (const product of payload.products) {
        const normalized = normalizeProductNumber(product.partNumber);
        const productId = productIdByNumber.get(normalized)!;
        const replacementProductId = product.replacementPartNumber
          ? productIdByNumber.get(
              normalizeProductNumber(product.replacementPartNumber),
            )!
          : null;
        const beforeDraftSnapshot =
          product.baselineDraftVersion === null
            ? null
            : await captureProductDraftSnapshot(transaction, productId);
        if (
          product.baselineDraftVersion !== null &&
          beforeDraftSnapshot === null
        ) {
          throw new ProductImportError("PREVIEW_STALE");
        }
        const draftData = {
          categoryId: product.categoryId,
          descriptionEn: product.translations.en.description,
          descriptionZhCn: product.translations.zhCn.description,
          fitmentSummaryEn: product.translations.en.fitmentSummary,
          fitmentSummaryZhCn: product.translations.zhCn.fitmentSummary,
          imageAltEn: product.translations.en.imageAlt,
          imageAltZhCn: product.translations.zhCn.imageAlt,
          imagePath: product.imagePath,
          lastModifiedByUserId: actor.id,
          nameEn: product.translations.en.name,
          nameZhCn: product.translations.zhCn.name,
          replacementProductId,
          restoredFromPublicationId: null,
          seoDescriptionEn: product.translations.en.seoDescription,
          seoDescriptionZhCn: product.translations.zhCn.seoDescription,
          seoTitleEn: product.translations.en.seoTitle,
          seoTitleZhCn: product.translations.zhCn.seoTitle,
          slugEn: product.translations.en.slug,
          slugZhCn: product.translations.zhCn.slug,
          status: product.status,
          summaryEn: product.translations.en.summary,
          summaryZhCn: product.translations.zhCn.summary,
          updatedAt: now,
        };
        let afterDraftVersion: number;
        if (product.baselineDraftVersion === null) {
          await transaction.productDraft.create({
            data: { ...draftData, productId, version: 1 },
          });
          afterDraftVersion = 1;
        } else {
          const updated = await transaction.productDraft.updateMany({
            data: { ...draftData, version: { increment: 1 } },
            where: {
              productId,
              version: product.baselineDraftVersion,
            },
          });
          if (updated.count !== 1) {
            throw new ProductImportError("PREVIEW_STALE");
          }
          afterDraftVersion = product.baselineDraftVersion + 1;
          await transaction.productDraftSpecificationValue.deleteMany({
            where: { productId },
          });
          await transaction.productDraftReference.deleteMany({
            where: { productId },
          });
          await transaction.productDraftFitment.deleteMany({
            where: { productId },
          });
        }

        if (product.specifications.length > 0) {
          await transaction.productDraftSpecificationValue.createMany({
            data: product.specifications.map((value) => ({
              ...value,
              productId,
            })),
          });
        }
        if (product.references.length > 0) {
          await transaction.productDraftReference.createMany({
            data: product.references.map((reference) => ({
              ...reference,
              productId,
            })),
          });
        }
        if (product.fitments.length > 0) {
          await transaction.productDraftFitment.createMany({
            data: product.fitments.map((fitment) => ({
              ...fitment,
              productId,
            })),
          });
        }
        const afterDraftSnapshot = await captureProductDraftSnapshot(
          transaction,
          productId,
        );
        if (!afterDraftSnapshot) {
          throw new ProductImportError("PREVIEW_STALE");
        }
        imported.push({
          afterDraftVersion,
          afterDraftSnapshot,
          beforeDraftVersion: product.baselineDraftVersion,
          beforeDraftSnapshot,
          partNumber: product.partNumber,
          publicationIdAtImport: product.baselineCurrentPublicationId,
          productId,
          productWasCreated: product.baselineProductId === null,
        });
      }

      const batch = await transaction.productImportBatch.create({
        data: {
          addedCount: preview.addedCount,
          affectedProductCount: preview.affectedProductCount,
          createdAt: now,
          createdByUserId: actor.id,
          fileHash: preview.fileHash,
          originalFilename: preview.originalFilename,
          previewId: preview.id,
          updatedCount: preview.updatedCount,
        },
      });
      await transaction.productImportBatchItem.createMany({
        data: imported.map(
          ({ afterDraftSnapshot, beforeDraftSnapshot, ...item }) => ({
            ...item,
            afterDraftSnapshot:
              afterDraftSnapshot as unknown as Prisma.InputJsonValue,
            batchId: batch.id,
            ...(beforeDraftSnapshot === null
              ? {}
              : {
                  beforeDraftSnapshot:
                    beforeDraftSnapshot as unknown as Prisma.InputJsonValue,
                }),
          }),
        ),
      });
      const confirmed = await transaction.productImportPreview.updateMany({
        data: { status: "confirmed" },
        where: { id: preview.id, status: "pending" },
      });
      if (confirmed.count !== 1) {
        throw new ProductImportError("ALREADY_CONFIRMED");
      }
      await transaction.auditLog.create({
        data: {
          actorRole: actor.role,
          actorUserId: actor.id,
          createdAt: now,
          event: "PRODUCT_IMPORT_CONFIRMED",
          outcome: "SUCCESS",
          summary: `新增 ${preview.addedCount} 个草稿，更新 ${preview.updatedCount} 个草稿；未自动发布。`,
          targetId: batch.id,
          targetType: "ProductImportBatch",
        },
      });

      return batch;
    },
    { isolationLevel: "Serializable" },
  );
}

type ProductImportRollbackTransactionResult =
  | {
      batchId: string;
      kind: "success";
      removedProductCount: number;
      restoredDraftCount: number;
      rolledBackAt: Date;
    }
  | {
      code:
        "ALREADY_ROLLED_BACK" | "ROLLBACK_CONFLICT" | "SNAPSHOT_UNAVAILABLE";
      conflicts?: ProductImportRollbackConflict[];
      kind: "rejected";
    };

function rollbackConflictSummary(
  conflicts: ProductImportRollbackConflict[],
): string {
  return conflicts
    .map(({ partNumber, reasons }) => `${partNumber}（${reasons.join("、")}）`)
    .join("；");
}

type RollbackAssessmentItem = {
  afterDraftSnapshot: Prisma.JsonValue | null;
  partNumber: string;
  productId: string;
  productWasCreated: boolean;
  publicationIdAtImport: string | null;
};

async function assessProductImportRollback(
  transaction: Prisma.TransactionClient,
  items: RollbackAssessmentItem[],
): Promise<ProductImportRollbackConflict[]> {
  const conflicts: ProductImportRollbackConflict[] = [];
  const affectedProductIds = items.map(({ productId }) => productId);
  for (const item of items) {
    const product = await transaction.product.findUnique({
      select: {
        _count: {
          select: {
            inquiries: true,
            inquirySubmissions: true,
            publications: true,
            publicationReplacements: true,
            quarantinedInquiries: true,
            replacedProducts: true,
          },
        },
        currentPublicationId: true,
        draft: {
          select: {
            lastModifiedBy: { select: { name: true } },
            updatedAt: true,
          },
        },
        id: true,
      },
      where: { id: item.productId },
    });
    const reasons: ProductImportRollbackConflictReason[] = [];
    const currentSnapshot = product
      ? await captureProductDraftSnapshot(transaction, product.id)
      : null;

    if (!product || !currentSnapshot) {
      reasons.push("DRAFT_MISSING");
    } else if (product.currentPublicationId !== item.publicationIdAtImport) {
      reasons.push("PUBLISHED_AFTER_IMPORT");
    } else if (
      item.afterDraftSnapshot === null ||
      JSON.stringify(currentSnapshot) !==
        JSON.stringify(draftSnapshotSchema.parse(item.afterDraftSnapshot))
    ) {
      reasons.push("MODIFIED_AFTER_IMPORT");
    }

    if (
      item.productWasCreated &&
      product &&
      (Object.values(product._count).some((count) => count > 0) ||
        (await transaction.productDraft.count({
          where: {
            productId: { notIn: affectedProductIds },
            replacementProductId: product.id,
          },
        })) > 0)
    ) {
      reasons.push("BUSINESS_HISTORY_AFTER_IMPORT");
    }

    if (reasons.length > 0) {
      conflicts.push({
        lastModifiedAt: product?.draft?.updatedAt ?? null,
        lastModifiedBy: product?.draft?.lastModifiedBy?.name ?? "系统",
        partNumber: item.partNumber,
        reasons: [...new Set(reasons)],
      });
    }
  }
  return conflicts;
}

export async function rollbackProductImportBatch({
  actor,
  batchId,
  now = new Date(),
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  batchId: string;
  now?: Date;
  prisma?: ApplicationDatabase;
}) {
  assertCanManageImports(actor);

  const result: ProductImportRollbackTransactionResult =
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${`product-import-rollback:${batchId}`}))
      `;
      await lockProductReplacementGraph(transaction);
      const batch = await transaction.productImportBatch.findUnique({
        include: {
          items: { orderBy: { partNumber: "asc" } },
        },
        where: { id: batchId },
      });
      if (!batch) throw new ProductImportError("NOT_FOUND");

      if (batch.rolledBackAt) {
        await transaction.auditLog.create({
          data: {
            actorRole: actor.role,
            actorUserId: actor.id,
            createdAt: now,
            event: "PRODUCT_IMPORT_ROLLBACK_REJECTED",
            outcome: "DUPLICATE",
            summary: "该导入批次已撤销，本次重复操作未改变任何草稿。",
            targetId: batch.id,
            targetType: "ProductImportBatch",
          },
        });
        return { code: "ALREADY_ROLLED_BACK", kind: "rejected" };
      }

      if (
        batch.items.some(
          (item) =>
            item.afterDraftSnapshot === null ||
            (!item.productWasCreated && item.beforeDraftSnapshot === null),
        )
      ) {
        await transaction.auditLog.create({
          data: {
            actorRole: actor.role,
            actorUserId: actor.id,
            createdAt: now,
            event: "PRODUCT_IMPORT_ROLLBACK_REJECTED",
            outcome: "CONFLICT",
            summary: "批次缺少可验证的草稿快照，未执行撤销。",
            targetId: batch.id,
            targetType: "ProductImportBatch",
          },
        });
        return { code: "SNAPSHOT_UNAVAILABLE", kind: "rejected" };
      }

      const productIds = batch.items.map(({ productId }) => productId);
      if (productIds.length > 0) {
        for (const productId of productIds.toSorted()) {
          await transaction.$queryRaw`
            SELECT "id" FROM "product" WHERE "id" = ${productId} FOR UPDATE
          `;
          await transaction.$queryRaw`
            SELECT "product_id" FROM "product_draft" WHERE "product_id" = ${productId} FOR UPDATE
          `;
        }
      }

      const conflicts = await assessProductImportRollback(
        transaction,
        batch.items,
      );

      if (conflicts.length > 0) {
        await transaction.auditLog.create({
          data: {
            actorRole: actor.role,
            actorUserId: actor.id,
            createdAt: now,
            event: "PRODUCT_IMPORT_ROLLBACK_REJECTED",
            outcome: "CONFLICT",
            summary: `整批撤销已拒绝：${rollbackConflictSummary(conflicts)}`,
            targetId: batch.id,
            targetType: "ProductImportBatch",
          },
        });
        return {
          code: "ROLLBACK_CONFLICT",
          conflicts,
          kind: "rejected",
        };
      }

      let removedProductCount = 0;
      let restoredDraftCount = 0;
      const existingProductItems = batch.items.filter(
        ({ productWasCreated }) => !productWasCreated,
      );
      for (const item of existingProductItems) {
        const snapshot = draftSnapshotSchema.parse(item.beforeDraftSnapshot);
        const {
          lastModifiedByUserId: ignoredLastModifiedByUserId,
          updatedAt: ignoredUpdatedAt,
          version: ignoredVersion,
          ...draftData
        } = snapshot.draft;
        void ignoredLastModifiedByUserId;
        void ignoredUpdatedAt;
        void ignoredVersion;

        await transaction.productDraftSpecificationValue.deleteMany({
          where: { productId: item.productId },
        });
        await transaction.productDraftReference.deleteMany({
          where: { productId: item.productId },
        });
        await transaction.productDraftFitment.deleteMany({
          where: { productId: item.productId },
        });
        const restored = await transaction.productDraft.updateMany({
          data: {
            ...draftData,
            lastModifiedByUserId: actor.id,
            updatedAt: now,
            version: item.afterDraftVersion + 1,
          },
          where: {
            productId: item.productId,
            version: item.afterDraftVersion,
          },
        });
        if (restored.count !== 1) {
          throw new ProductImportError("ROLLBACK_CONFLICT");
        }
        if (snapshot.specificationValues.length > 0) {
          await transaction.productDraftSpecificationValue.createMany({
            data: snapshot.specificationValues.map((value) => ({
              ...value,
              productId: item.productId,
            })),
          });
        }
        if (snapshot.references.length > 0) {
          await transaction.productDraftReference.createMany({
            data: snapshot.references.map((reference) => ({
              ...reference,
              productId: item.productId,
            })),
          });
        }
        if (snapshot.fitments.length > 0) {
          await transaction.productDraftFitment.createMany({
            data: snapshot.fitments.map((fitment) => ({
              ...fitment,
              productId: item.productId,
            })),
          });
        }
        restoredDraftCount += 1;
      }

      const createdProductIds = batch.items
        .filter(({ productWasCreated }) => productWasCreated)
        .map(({ productId }) => productId);
      if (createdProductIds.length > 0) {
        // Restoring existing drafts first removes any same-batch references to
        // products that are about to disappear. Clearing references between
        // newly created drafts avoids depending on part-number/delete order.
        await transaction.productDraft.updateMany({
          data: { replacementProductId: null },
          where: { productId: { in: createdProductIds } },
        });
        const removed = await transaction.product.deleteMany({
          where: { id: { in: createdProductIds } },
        });
        if (removed.count !== createdProductIds.length) {
          throw new ProductImportError("ROLLBACK_CONFLICT");
        }
        removedProductCount = removed.count;
      }

      await transaction.productImportBatch.update({
        data: { rolledBackAt: now, rolledBackByUserId: actor.id },
        where: { id: batch.id },
      });
      await transaction.auditLog.create({
        data: {
          actorRole: actor.role,
          actorUserId: actor.id,
          createdAt: now,
          event: "PRODUCT_IMPORT_ROLLED_BACK",
          outcome: "SUCCESS",
          summary: `已恢复 ${restoredDraftCount} 个既有草稿并移除 ${removedProductCount} 个本批次新增产品；公开版本未改变。`,
          targetId: batch.id,
          targetType: "ProductImportBatch",
        },
      });

      return {
        batchId: batch.id,
        kind: "success",
        removedProductCount,
        restoredDraftCount,
        rolledBackAt: now,
      };
    });

  if (result.kind === "rejected") {
    throw new ProductImportError(result.code, result.conflicts);
  }
  return result;
}

export async function getProductImportBatch({
  actor,
  batchId,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  batchId: string;
  prisma?: ApplicationDatabase;
}) {
  assertCanManageImports(actor);
  return prisma.$transaction(async (transaction) => {
    const batch = await transaction.productImportBatch.findUnique({
      include: {
        createdBy: { select: { name: true } },
        items: {
          orderBy: { partNumber: "asc" },
          select: {
            afterDraftSnapshot: true,
            afterDraftVersion: true,
            beforeDraftSnapshot: true,
            beforeDraftVersion: true,
            partNumber: true,
            productId: true,
            productWasCreated: true,
            publicationIdAtImport: true,
          },
        },
        rolledBackBy: { select: { name: true } },
      },
      where: { id: batchId },
    });
    if (!batch) throw new ProductImportError("NOT_FOUND");

    const snapshotsAvailable = batch.items.every(
      (item) =>
        item.afterDraftSnapshot !== null &&
        (item.productWasCreated || item.beforeDraftSnapshot !== null),
    );
    const rollbackConflicts =
      batch.rolledBackAt || !snapshotsAvailable
        ? []
        : await assessProductImportRollback(transaction, batch.items);
    const items = batch.items.map(
      ({ afterDraftSnapshot, beforeDraftSnapshot, ...item }) => {
        void afterDraftSnapshot;
        void beforeDraftSnapshot;
        return item;
      },
    );

    return {
      ...batch,
      displayNumber: formatProductImportBatchNumber(batch.batchNumber),
      items,
      rollbackConflicts,
      rollbackStatus: batch.rolledBackAt
        ? ("rolled_back" as const)
        : !snapshotsAvailable
          ? ("unavailable" as const)
          : rollbackConflicts.length > 0
            ? ("conflict" as const)
            : ("eligible" as const),
    };
  });
}

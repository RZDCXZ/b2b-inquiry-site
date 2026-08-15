import { createHash, randomUUID } from "node:crypto";

import { z } from "zod";

import type { Prisma } from "@/src/generated/prisma/client";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import { normalizeProductNumber } from "@/src/modules/catalog/public/product-identity";
import {
  type ProductImportChange,
  type ProductImportError as ProductImportIssue,
  type ProductImportPayload,
  type ProductImportPayloadProduct,
  type ProductImportPreviewView,
  PRODUCT_IMPORT_SHEETS,
} from "@/src/modules/catalog/public/product-import";
import {
  createProductImportErrorWorkbook,
  createProductImportWorkbook,
  parseProductImportWorkbook,
  productImportCatalogFingerprint,
  type ProductImportCatalogContext,
  type ProductImportFile,
} from "@/src/modules/catalog/server/product-import-workbook";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";

export { PRODUCT_IMPORT_SHEETS };
export { PRODUCT_IMPORT_XLSX_MIME } from "@/src/modules/catalog/server/product-import-workbook";

export class ProductImportError extends Error {
  constructor(
    readonly code:
      | "ALREADY_CONFIRMED"
      | "FORBIDDEN"
      | "HAS_VALIDATION_ERRORS"
      | "NOT_FOUND"
      | "PREVIEW_STALE",
  ) {
    super(code);
    this.name = "ProductImportError";
  }
}

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
      replacementPartNumber: z.string().nullable(),
      specifications: z.array(specificationPayloadSchema),
      status: z.enum(["discontinued", "published"]),
      translations: z.object({
        en: translationPayloadSchema,
        zhCn: translationPayloadSchema,
      }),
    }),
  ),
});

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
      const currentCatalog = await loadProductImportCatalogContext(transaction);
      if (
        productImportCatalogFingerprint(currentCatalog) !==
        payload.catalogFingerprint
      ) {
        throw new ProductImportError("PREVIEW_STALE");
      }
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
        if (current) productIdByNumber.set(normalized, current.id);
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
        beforeDraftVersion: number | null;
        partNumber: string;
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
        imported.push({
          afterDraftVersion,
          beforeDraftVersion: product.baselineDraftVersion,
          partNumber: product.partNumber,
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
        data: imported.map((item) => ({ ...item, batchId: batch.id })),
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

export function formatProductImportBatchNumber(batchNumber: number): string {
  return `B-${String(batchNumber).padStart(3, "0")}`;
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
  const batch = await prisma.productImportBatch.findUnique({
    include: {
      createdBy: { select: { name: true } },
      items: {
        orderBy: { partNumber: "asc" },
        select: {
          afterDraftVersion: true,
          beforeDraftVersion: true,
          partNumber: true,
          productWasCreated: true,
        },
      },
    },
    where: { id: batchId },
  });
  if (!batch) throw new ProductImportError("NOT_FOUND");
  return {
    ...batch,
    displayNumber: formatProductImportBatchNumber(batch.batchNumber),
  };
}

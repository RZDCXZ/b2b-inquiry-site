import ExcelJS from "exceljs";
import { afterAll, describe, expect, test } from "vitest";

import {
  confirmProductImport,
  createProductImportTemplate,
  previewProductImport,
  rollbackProductImportBatch,
} from "@/src/application/product-import";
import { publishProductDraft } from "@/src/application/product-publishing";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { addFuelProductToImportWorkbook } from "@/tests/product-import-workbook-fixture";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);
const contentEditor: AdminActor = {
  id: "demo-user-content_editor",
  name: "王晴",
  role: "content_editor",
};

async function workbookBytes(
  mutate: (workbook: ExcelJS.Workbook) => void,
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await createProductImportTemplate()) as never);
  mutate(workbook);
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

describe("产品导入批次撤销", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("原子恢复已有草稿、移除本批次新增产品并允许确定性重导入", async () => {
    const existingPartNumber = "TQ-FL-4827";
    const newPartNumber = "TQ-A-ROLLBACK-NEW";
    const newReferrerPartNumber = "TQ-B-ROLLBACK-REFERRER";
    const before = await prisma.product.findUniqueOrThrow({
      include: {
        draft: {
          include: {
            fitments: { orderBy: { id: "asc" } },
            references: { orderBy: { id: "asc" } },
            specificationValues: { orderBy: { position: "asc" } },
          },
        },
        publications: { select: { id: true }, orderBy: { version: "asc" } },
      },
      where: { normalizedPartNumber: "TQFL4827" },
    });
    const bytes = await workbookBytes((workbook) => {
      addFuelProductToImportWorkbook(workbook, {
        name: "Rollback updated filter",
        partNumber: existingPartNumber,
        replacementPartNumber: "TQ-AF-2106",
        slug: "rollback-updated-filter",
        status: "discontinued",
      });
      addFuelProductToImportWorkbook(workbook, {
        name: "Rollback new filter",
        partNumber: newPartNumber,
        slug: "rollback-new-filter",
      });
      addFuelProductToImportWorkbook(workbook, {
        name: "Rollback new referrer",
        partNumber: newReferrerPartNumber,
        replacementPartNumber: "TQ-AF-2106",
        slug: "rollback-new-referrer",
        status: "discontinued",
      });
    });
    const previewIds: string[] = [];
    const batchIds: string[] = [];

    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const preview = await previewProductImport({
          actor: contentEditor,
          file: {
            bytes,
            declaredMimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            originalFilename: "rollback-and-reimport.xlsx",
          },
          prisma,
        });
        previewIds.push(preview.id);
        expect(preview).toMatchObject({
          addedCount: 2,
          affectedProductCount: 3,
          canConfirm: true,
          errors: [],
          updatedCount: 1,
        });

        const batch = await confirmProductImport({
          actor: contentEditor,
          now: new Date(`2026-08-15T0${2 + attempt}:00:00.000Z`),
          previewId: preview.id,
          prisma,
        });
        batchIds.push(batch.id);
        await expect(
          prisma.productImportBatch.findUniqueOrThrow({
            include: { items: { orderBy: { partNumber: "asc" } } },
            where: { id: batch.id },
          }),
        ).resolves.toMatchObject({
          id: batch.id,
          items: expect.arrayContaining([
            expect.objectContaining({
              afterDraftSnapshot: expect.any(Object),
              beforeDraftSnapshot: expect.any(Object),
              beforeDraftVersion: expect.any(Number),
              partNumber: existingPartNumber,
            }),
            expect.objectContaining({
              afterDraftSnapshot: expect.any(Object),
              beforeDraftSnapshot: null,
              beforeDraftVersion: null,
              partNumber: newPartNumber,
            }),
            expect.objectContaining({
              afterDraftSnapshot: expect.any(Object),
              beforeDraftSnapshot: null,
              beforeDraftVersion: null,
              partNumber: newReferrerPartNumber,
            }),
          ]),
        });

        await expect(
          rollbackProductImportBatch({
            actor: contentEditor,
            batchId: batch.id,
            now: new Date(`2026-08-15T0${4 + attempt}:00:00.000Z`),
            prisma,
          }),
        ).resolves.toMatchObject({
          batchId: batch.id,
          removedProductCount: 2,
          restoredDraftCount: 1,
        });

        const restored = await prisma.product.findUniqueOrThrow({
          include: {
            draft: {
              include: {
                fitments: { orderBy: { id: "asc" } },
                references: { orderBy: { id: "asc" } },
                specificationValues: { orderBy: { position: "asc" } },
              },
            },
            publications: {
              select: { id: true },
              orderBy: { version: "asc" },
            },
          },
          where: { id: before.id },
        });
        expect(restored.currentPublicationId).toBe(before.currentPublicationId);
        expect(restored.publications).toEqual(before.publications);
        expect(restored.draft).toMatchObject({
          categoryId: before.draft!.categoryId,
          descriptionEn: before.draft!.descriptionEn,
          descriptionZhCn: before.draft!.descriptionZhCn,
          fitmentSummaryEn: before.draft!.fitmentSummaryEn,
          fitmentSummaryZhCn: before.draft!.fitmentSummaryZhCn,
          imageAltEn: before.draft!.imageAltEn,
          imageAltZhCn: before.draft!.imageAltZhCn,
          imageAssetId: before.draft!.imageAssetId,
          imagePath: before.draft!.imagePath,
          documentAssetId: before.draft!.documentAssetId,
          lastPublishedVersion: before.draft!.lastPublishedVersion,
          nameEn: before.draft!.nameEn,
          nameZhCn: before.draft!.nameZhCn,
          replacementProductId: before.draft!.replacementProductId,
          seoDescriptionEn: before.draft!.seoDescriptionEn,
          seoDescriptionZhCn: before.draft!.seoDescriptionZhCn,
          seoTitleEn: before.draft!.seoTitleEn,
          seoTitleZhCn: before.draft!.seoTitleZhCn,
          slugEn: before.draft!.slugEn,
          slugZhCn: before.draft!.slugZhCn,
          status: before.draft!.status,
          summaryEn: before.draft!.summaryEn,
          summaryZhCn: before.draft!.summaryZhCn,
        });
        expect(restored.draft!.version).toBeGreaterThan(before.draft!.version);
        expect(restored.draft!.fitments).toHaveLength(
          before.draft!.fitments.length,
        );
        expect(
          restored
            .draft!.references.map(({ brand, referenceNumber }) => ({
              brand,
              referenceNumber,
            }))
            .toSorted((left, right) =>
              `${left.brand}:${left.referenceNumber}`.localeCompare(
                `${right.brand}:${right.referenceNumber}`,
              ),
            ),
        ).toEqual(
          before
            .draft!.references.map(({ brand, referenceNumber }) => ({
              brand,
              referenceNumber,
            }))
            .toSorted((left, right) =>
              `${left.brand}:${left.referenceNumber}`.localeCompare(
                `${right.brand}:${right.referenceNumber}`,
              ),
            ),
        );
        expect(
          restored.draft!.specificationValues.map(
            ({ attributeCode, booleanValue, decimalValue, textValue }) => ({
              attributeCode,
              booleanValue,
              decimalValue: decimalValue?.toString() ?? null,
              textValue,
            }),
          ),
        ).toEqual(
          before.draft!.specificationValues.map(
            ({ attributeCode, booleanValue, decimalValue, textValue }) => ({
              attributeCode,
              booleanValue,
              decimalValue: decimalValue?.toString() ?? null,
              textValue,
            }),
          ),
        );
        await expect(
          prisma.product.count({
            where: {
              normalizedPartNumber: {
                in: ["TQAROLLBACKNEW", "TQBROLLBACKREFERRER"],
              },
            },
          }),
        ).resolves.toBe(0);
      }

      await expect(
        prisma.auditLog.count({
          where: {
            event: "PRODUCT_IMPORT_ROLLED_BACK",
            outcome: "SUCCESS",
            targetId: { in: batchIds },
          },
        }),
      ).resolves.toBe(2);
    } finally {
      await prisma.auditLog.deleteMany({
        where: { targetId: { in: batchIds } },
      });
      await prisma.productImportBatch.deleteMany({
        where: { id: { in: batchIds } },
      });
      await prisma.productImportPreview.deleteMany({
        where: { id: { in: previewIds } },
      });
      const {
        fitments,
        productId,
        references,
        specificationValues,
        ...draftData
      } = before.draft!;
      await prisma.$transaction(async (transaction) => {
        await transaction.productDraftSpecificationValue.deleteMany({
          where: { productId },
        });
        await transaction.productDraftReference.deleteMany({
          where: { productId },
        });
        await transaction.productDraftFitment.deleteMany({
          where: { productId },
        });
        await transaction.productDraft.update({
          data: draftData,
          where: { productId },
        });
        await transaction.productDraftSpecificationValue.createMany({
          data: specificationValues,
        });
        await transaction.productDraftReference.createMany({
          data: references.map(({ brand, id, referenceNumber }) => ({
            brand,
            id,
            productId,
            referenceNumber,
          })),
        });
        await transaction.productDraftFitment.createMany({ data: fitments });
        const cleanupProducts = await transaction.product.findMany({
          select: { id: true },
          where: {
            normalizedPartNumber: {
              in: ["TQAROLLBACKNEW", "TQBROLLBACKREFERRER"],
            },
          },
        });
        const cleanupProductIds = cleanupProducts.map(({ id }) => id);
        if (cleanupProductIds.length > 0) {
          await transaction.productDraft.updateMany({
            data: { replacementProductId: null },
            where: { productId: { in: cleanupProductIds } },
          });
          await transaction.product.deleteMany({
            where: { id: { in: cleanupProductIds } },
          });
        }
      });
    }
  });

  test("任一草稿在导入后编辑或发布都会拒绝整批撤销并列出原因", async () => {
    const modifiedPartNumber = "TQ-ROLLBACK-MODIFIED";
    const publishedPartNumber = "TQ-ROLLBACK-PUBLISHED";
    const bytes = await workbookBytes((workbook) => {
      addFuelProductToImportWorkbook(workbook, {
        name: "Rollback modified conflict",
        partNumber: modifiedPartNumber,
        slug: "rollback-modified-conflict",
      });
      addFuelProductToImportWorkbook(workbook, {
        name: "Rollback published conflict",
        partNumber: publishedPartNumber,
        slug: "rollback-published-conflict",
      });
    });
    const preview = await previewProductImport({
      actor: contentEditor,
      file: {
        bytes,
        declaredMimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        originalFilename: "rollback-conflicts.xlsx",
      },
      prisma,
    });
    const batch = await confirmProductImport({
      actor: contentEditor,
      now: new Date("2026-08-15T06:00:00.000Z"),
      previewId: preview.id,
      prisma,
    });

    try {
      await prisma.productDraft.update({
        data: {
          lastModifiedByUserId: contentEditor.id,
          summaryZhCn: "导入后人工修改。",
          updatedAt: new Date("2026-08-15T06:30:00.000Z"),
          version: { increment: 1 },
        },
        where: {
          productId: (
            await prisma.product.findUniqueOrThrow({
              select: { id: true },
              where: { normalizedPartNumber: "TQROLLBACKMODIFIED" },
            })
          ).id,
        },
      });
      await publishProductDraft({
        actor: contentEditor,
        expectedDraftVersion: 1,
        now: new Date("2026-08-15T06:45:00.000Z"),
        partNumber: publishedPartNumber,
        prisma,
      });

      await expect(
        rollbackProductImportBatch({
          actor: contentEditor,
          batchId: batch.id,
          now: new Date("2026-08-15T07:00:00.000Z"),
          prisma,
        }),
      ).rejects.toMatchObject({
        code: "ROLLBACK_CONFLICT",
        conflicts: expect.arrayContaining([
          expect.objectContaining({
            lastModifiedBy: contentEditor.name,
            partNumber: modifiedPartNumber,
            reasons: ["MODIFIED_AFTER_IMPORT"],
          }),
          expect.objectContaining({
            partNumber: publishedPartNumber,
            reasons: expect.arrayContaining(["PUBLISHED_AFTER_IMPORT"]),
          }),
        ]),
      });
      await expect(
        prisma.product.count({
          where: {
            normalizedPartNumber: {
              in: ["TQROLLBACKMODIFIED", "TQROLLBACKPUBLISHED"],
            },
          },
        }),
      ).resolves.toBe(2);
      await expect(
        prisma.auditLog.findFirst({
          where: {
            event: "PRODUCT_IMPORT_ROLLBACK_REJECTED",
            outcome: "CONFLICT",
            targetId: batch.id,
          },
        }),
      ).resolves.toMatchObject({
        summary: expect.stringContaining(modifiedPartNumber),
      });
    } finally {
      const products = await prisma.product.findMany({
        select: { id: true },
        where: {
          normalizedPartNumber: {
            in: ["TQROLLBACKMODIFIED", "TQROLLBACKPUBLISHED"],
          },
        },
      });
      const productIds = products.map(({ id }) => id);
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRawUnsafe(
          "SET LOCAL torquelis.allow_product_publication_mutation = 'on'",
        );
        await transaction.auditLog.deleteMany({
          where: {
            OR: [{ targetId: batch.id }, { targetId: { in: productIds } }],
          },
        });
        await transaction.product.updateMany({
          data: {
            currentPublicationId: null,
            replacementProductId: null,
            status: "draft",
          },
          where: { id: { in: productIds } },
        });
        await transaction.productPublication.deleteMany({
          where: { productId: { in: productIds } },
        });
        await transaction.productImportBatch.delete({
          where: { id: batch.id },
        });
        await transaction.productImportPreview.delete({
          where: { id: preview.id },
        });
        await transaction.product.deleteMany({
          where: { id: { in: productIds } },
        });
      });
    }
  });

  test("并发撤销只有一个成功，重复操作不再次改变数据并写入审计", async () => {
    const partNumber = "TQ-ROLLBACK-CONCURRENT";
    const bytes = await workbookBytes((workbook) => {
      addFuelProductToImportWorkbook(workbook, {
        name: "Concurrent rollback filter",
        partNumber,
        slug: "concurrent-rollback-filter",
      });
    });
    const preview = await previewProductImport({
      actor: contentEditor,
      file: {
        bytes,
        declaredMimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        originalFilename: "concurrent-rollback.xlsx",
      },
      prisma,
    });
    const batch = await confirmProductImport({
      actor: contentEditor,
      previewId: preview.id,
      prisma,
    });

    try {
      const attempts = await Promise.allSettled([
        rollbackProductImportBatch({
          actor: contentEditor,
          batchId: batch.id,
          now: new Date("2026-08-15T08:00:00.000Z"),
          prisma,
        }),
        rollbackProductImportBatch({
          actor: contentEditor,
          batchId: batch.id,
          now: new Date("2026-08-15T08:00:01.000Z"),
          prisma,
        }),
      ]);

      expect(
        attempts.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        (
          attempts.find(
            ({ status }) => status === "rejected",
          ) as PromiseRejectedResult
        ).reason,
      ).toMatchObject({ code: "ALREADY_ROLLED_BACK" });
      await expect(
        prisma.product.findUnique({
          where: { normalizedPartNumber: "TQROLLBACKCONCURRENT" },
        }),
      ).resolves.toBeNull();
      await expect(
        prisma.auditLog.findMany({
          select: { event: true, outcome: true },
          where: {
            event: {
              in: [
                "PRODUCT_IMPORT_ROLLED_BACK",
                "PRODUCT_IMPORT_ROLLBACK_REJECTED",
              ],
            },
            targetId: batch.id,
          },
        }),
      ).resolves.toEqual(
        expect.arrayContaining([
          { event: "PRODUCT_IMPORT_ROLLED_BACK", outcome: "SUCCESS" },
          {
            event: "PRODUCT_IMPORT_ROLLBACK_REJECTED",
            outcome: "DUPLICATE",
          },
        ]),
      );
    } finally {
      await prisma.auditLog.deleteMany({ where: { targetId: batch.id } });
      await prisma.productImportBatch.delete({ where: { id: batch.id } });
      await prisma.productImportPreview.delete({ where: { id: preview.id } });
      await prisma.product.deleteMany({
        where: { normalizedPartNumber: "TQROLLBACKCONCURRENT" },
      });
    }
  });
});

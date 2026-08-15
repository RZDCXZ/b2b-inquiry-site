import ExcelJS from "exceljs";
import { afterAll, describe, expect, test } from "vitest";

import {
  confirmProductImport,
  createProductImportErrorReport,
  createProductImportTemplate,
  previewProductImport,
} from "@/src/application/product-import";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";

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

function addFuelProduct(
  workbook: ExcelJS.Workbook,
  {
    name,
    partNumber,
    slug,
  }: { name: string; partNumber: string; slug: string },
) {
  workbook
    .getWorksheet("产品")!
    .addRow([
      partNumber,
      "fuel",
      "/assets/fuel-filter-product.png",
      "published",
      "",
    ]);
  workbook.getWorksheet("翻译")!.addRows([
    [
      partNumber,
      "en",
      name,
      slug,
      "Imported draft summary.",
      "Imported draft description.",
      `${name} | Torquelis Filters`,
      "Imported draft SEO description.",
      `${name} demonstration image`,
      "Selected Northline commercial vehicles.",
    ],
    [
      partNumber,
      "zh-cn",
      `${name} 中文`,
      `${slug}-zh-cn`,
      "导入的草稿摘要。",
      "导入的草稿详细说明。",
      `${name} 中文｜拓擎利滤清`,
      "导入的草稿 SEO 描述。",
      `${name} 演示图片`,
      "适用于指定 Northline 商用车型。",
    ],
  ]);
  workbook.getWorksheet("规格值")!.addRows([
    [partNumber, "construction_type", "spin_on", ""],
    [partNumber, "outer_diameter", 98, "millimetre"],
    [partNumber, "height", 180, "millimetre"],
    [partNumber, "connection_specification", "M18 × 1.5", ""],
    [partNumber, "filtration_rating", 8, "micrometre"],
    [partNumber, "rated_flow", 5.8, "litre_per_minute"],
    [partNumber, "water_separation", "true", ""],
  ]);
  workbook
    .getWorksheet("参考号")!
    .addRow([partNumber, "Novera", `${partNumber}-REF`]);
  workbook
    .getWorksheet("适配关系")!
    .addRow([partNumber, "Northline", "HX9", "N13-420", 2020, 2025]);
}

async function createExistingImportDraft({
  id,
  partNumber,
  version,
}: {
  id: string;
  partNumber: string;
  version: number;
}) {
  await prisma.product.create({
    data: {
      categoryId: "category-fuel",
      id,
      imagePath: "/assets/fuel-filter-product.png",
      partNumber,
      status: "draft",
    },
  });
  await prisma.productDraft.create({
    data: {
      categoryId: "category-fuel",
      descriptionEn: "Existing draft.",
      descriptionZhCn: "已有草稿。",
      fitmentSummaryEn: "Existing fitment summary.",
      fitmentSummaryZhCn: "已有适配摘要。",
      imageAltEn: "Existing image",
      imageAltZhCn: "已有图片",
      imagePath: "/assets/fuel-filter-product.png",
      nameEn: "Existing import draft",
      nameZhCn: "已有导入草稿",
      productId: id,
      seoDescriptionEn: "Existing SEO description.",
      seoDescriptionZhCn: "已有 SEO 描述。",
      seoTitleEn: "Existing import draft | Torquelis",
      seoTitleZhCn: "已有导入草稿｜拓擎利",
      slugEn: `existing-${partNumber.toLocaleLowerCase()}`,
      slugZhCn: `已有-${partNumber.toLocaleLowerCase()}`,
      status: "published",
      summaryEn: "Existing summary.",
      summaryZhCn: "已有摘要。",
      version,
    },
  });
}

describe("产品 Excel 导入", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("内容编辑下载包含五个业务工作表和字段说明的模板", async () => {
    const bytes = await createProductImportTemplate();
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(bytes as never);

    expect(workbook.worksheets.map(({ name }) => name)).toEqual([
      "产品",
      "翻译",
      "规格值",
      "参考号",
      "适配关系",
      "字段说明",
    ]);
    expect(workbook.getWorksheet("产品")?.getRow(1).values).toEqual([
      undefined,
      "产品编号",
      "分类代码",
      "图片路径",
      "状态",
      "替代产品编号",
    ]);
    expect(workbook.getWorksheet("字段说明")?.rowCount).toBeGreaterThan(20);
  });

  test("预览一次收集跨表、重复编号、规格和适配错误", async () => {
    const bytes = await workbookBytes((workbook) => {
      workbook.getWorksheet("产品")!.addRows([
        [
          "TQ-IMP-ERROR",
          "fuel",
          "/assets/fuel-filter-product.png",
          "published",
          "",
        ],
        ["TQ-IMP-ERROR", "fuel", "", "published", ""],
      ]);
      workbook.getWorksheet("翻译")!.addRows([
        [
          "TQ-IMP-ERROR",
          "en",
          "Error preview product",
          "error-preview-product",
          "Preview all errors.",
          "Preview all workbook errors before importing.",
          "Error preview | Torquelis",
          "Preview all workbook errors.",
          "Demonstration filter",
          "Selected commercial vehicles.",
        ],
        [
          "TQ-IMP-ERROR",
          "en",
          "",
          "duplicate-error-preview-product",
          "Preview all errors.",
          "<script>invalid rich text</script>",
          "Duplicate error preview | Torquelis",
          "Preview all workbook errors.",
          "Demonstration filter",
          "Selected commercial vehicles.",
        ],
      ]);
      workbook.getWorksheet("规格值")!.addRows([
        ["TQ-IMP-ERROR", "unknown_attribute", "98", "millimetre"],
        ["TQ-IMP-ERROR", "outer_diameter", "98", "millimetre"],
        ["TQ-IMP-ERROR", "outer_diameter", "not-a-number", "litre_per_minute"],
      ]);
      workbook
        .getWorksheet("参考号")!
        .addRow(["TQ-MISSING", "Novera", "MISS-1"]);
      workbook
        .getWorksheet("适配关系")!
        .addRow(["TQ-IMP-ERROR", "Northline", "HX9", "UNKNOWN", 2025, 2020]);
    });

    const preview = await previewProductImport({
      actor: contentEditor,
      file: {
        bytes,
        declaredMimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        originalFilename: "all-errors.xlsx",
      },
      prisma,
    });

    try {
      expect(preview.canConfirm).toBe(false);
      expect(preview.errors.map(({ code }) => code)).toEqual(
        expect.arrayContaining([
          "PRODUCT_NUMBER_DUPLICATE",
          "PRODUCT_ROW_MISSING",
          "TRANSLATION_MISSING",
          "SPECIFICATION_ATTRIBUTE_NOT_FOUND",
          "SPECIFICATION_ATTRIBUTE_DUPLICATE",
          "SPECIFICATION_UNIT_INVALID",
          "SPECIFICATION_VALUE_INVALID",
          "FITMENT_NOT_FOUND",
          "FITMENT_YEAR_RANGE_INVALID",
          "FIELD_INVALID",
          "FIELD_REQUIRED",
          "TRANSLATION_DUPLICATE",
        ]),
      );
      expect(preview.errors.length).toBeGreaterThanOrEqual(6);
      await expect(
        confirmProductImport({
          actor: contentEditor,
          previewId: preview.id,
          prisma,
        }),
      ).rejects.toMatchObject({ code: "HAS_VALIDATION_ERRORS" });
      const reportBytes = await createProductImportErrorReport({
        actor: contentEditor,
        previewId: preview.id,
        prisma,
      });
      const report = new ExcelJS.Workbook();
      await report.xlsx.load(reportBytes as never);
      expect(report.getWorksheet("错误报告")?.rowCount).toBe(
        preview.errors.length + 1,
      );
      expect(report.getWorksheet("错误报告")?.getRow(2).values).toEqual(
        expect.arrayContaining([
          "产品",
          "产品编号",
          "PRODUCT_NUMBER_DUPLICATE",
        ]),
      );
    } finally {
      await prisma.productImportPreview.delete({ where: { id: preview.id } });
    }
  });

  test("确认后在一个批次中新增和更新草稿且不自动公开", async () => {
    const existingProductId = "product-ticket-16-import-update";
    const existingPartNumber = "TQ-IMP-UPDATE";
    const newPartNumber = "TQ-IMP-NEW";
    const untouchedBefore = await prisma.productDraft.findUniqueOrThrow({
      select: { version: true },
      where: { productId: "product-tq-af-2106" },
    });
    await createExistingImportDraft({
      id: existingProductId,
      partNumber: existingPartNumber,
      version: 4,
    });
    const bytes = await workbookBytes((workbook) => {
      addFuelProduct(workbook, {
        name: "Updated import draft",
        partNumber: existingPartNumber,
        slug: "updated-import-draft",
      });
      addFuelProduct(workbook, {
        name: "New import draft",
        partNumber: newPartNumber,
        slug: "new-import-draft",
      });
    });
    let previewId: string | undefined;
    let batchId: string | undefined;

    try {
      const preview = await previewProductImport({
        actor: contentEditor,
        file: {
          bytes,
          declaredMimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          originalFilename: "valid-new-and-update.xlsx",
        },
        prisma,
      });
      previewId = preview.id;
      expect(preview).toMatchObject({
        addedCount: 1,
        affectedProductCount: 2,
        canConfirm: true,
        errors: [],
        updatedCount: 1,
      });
      expect(
        preview.products.find(
          ({ partNumber }) => partNumber === existingPartNumber,
        )?.changes,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            after: "Updated import draft",
            before: "Existing import draft",
            field: "产品名称（英文）",
          }),
          expect.objectContaining({ field: "规格 · outer_diameter" }),
          expect.objectContaining({ field: "参考号" }),
          expect.objectContaining({ field: "适配关系" }),
        ]),
      );

      const batch = await confirmProductImport({
        actor: contentEditor,
        now: new Date("2026-08-15T02:00:00.000Z"),
        previewId: preview.id,
        prisma,
      });
      batchId = batch.id;

      expect(batch).toMatchObject({
        addedCount: 1,
        affectedProductCount: 2,
        originalFilename: "valid-new-and-update.xlsx",
        updatedCount: 1,
      });
      await expect(
        prisma.product.findUniqueOrThrow({
          include: {
            draft: {
              include: {
                fitments: true,
                references: true,
                specificationValues: true,
              },
            },
          },
          where: { normalizedPartNumber: "TQIMPUPDATE" },
        }),
      ).resolves.toMatchObject({
        currentPublicationId: null,
        status: "draft",
        draft: {
          nameEn: "Updated import draft",
          references: [{ brand: "Novera" }],
          status: "published",
          version: 5,
        },
      });
      await expect(
        prisma.product.findUniqueOrThrow({
          include: { draft: true },
          where: { normalizedPartNumber: "TQIMPNEW" },
        }),
      ).resolves.toMatchObject({
        currentPublicationId: null,
        status: "draft",
        draft: { nameEn: "New import draft", version: 1 },
      });
      await expect(
        prisma.productDraft.findUniqueOrThrow({
          select: { version: true },
          where: { productId: "product-tq-af-2106" },
        }),
      ).resolves.toEqual(untouchedBefore);
      await expect(
        prisma.productImportBatch.findUniqueOrThrow({
          include: { items: true },
          where: { id: batch.id },
        }),
      ).resolves.toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            afterDraftVersion: 5,
            beforeDraftVersion: 4,
            productWasCreated: false,
          }),
          expect.objectContaining({
            afterDraftVersion: 1,
            beforeDraftVersion: null,
            productWasCreated: true,
          }),
        ]),
      });
    } finally {
      if (batchId) {
        await prisma.auditLog.deleteMany({ where: { targetId: batchId } });
        await prisma.productImportBatch.delete({ where: { id: batchId } });
      }
      if (previewId) {
        await prisma.productImportPreview.delete({ where: { id: previewId } });
      }
      await prisma.product.deleteMany({
        where: {
          normalizedPartNumber: { in: ["TQIMPUPDATE", "TQIMPNEW"] },
        },
      });
    }
  });

  test("预览后的草稿版本变化会拒绝整个过期批次", async () => {
    const firstId = "product-ticket-16-stale-first";
    const secondId = "product-ticket-16-stale-second";
    const firstPartNumber = "TQ-IMP-STALE-1";
    const secondPartNumber = "TQ-IMP-STALE-2";
    await createExistingImportDraft({
      id: firstId,
      partNumber: firstPartNumber,
      version: 2,
    });
    await createExistingImportDraft({
      id: secondId,
      partNumber: secondPartNumber,
      version: 7,
    });
    const bytes = await workbookBytes((workbook) => {
      addFuelProduct(workbook, {
        name: "First stale candidate",
        partNumber: firstPartNumber,
        slug: "first-stale-candidate",
      });
      addFuelProduct(workbook, {
        name: "Second stale candidate",
        partNumber: secondPartNumber,
        slug: "second-stale-candidate",
      });
    });
    const preview = await previewProductImport({
      actor: contentEditor,
      file: {
        bytes,
        declaredMimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        originalFilename: "stale-preview.xlsx",
      },
      prisma,
    });

    try {
      expect(preview.canConfirm).toBe(true);
      await prisma.productDraft.update({
        data: { version: { increment: 1 } },
        where: { productId: secondId },
      });

      await expect(
        confirmProductImport({
          actor: contentEditor,
          previewId: preview.id,
          prisma,
        }),
      ).rejects.toMatchObject({ code: "PREVIEW_STALE" });
      await expect(
        prisma.productDraft.findUniqueOrThrow({
          select: { nameEn: true, version: true },
          where: { productId: firstId },
        }),
      ).resolves.toEqual({ nameEn: "Existing import draft", version: 2 });
      await expect(
        prisma.productImportBatch.count({ where: { previewId: preview.id } }),
      ).resolves.toBe(0);
    } finally {
      await prisma.productImportPreview.delete({ where: { id: preview.id } });
      await prisma.product.deleteMany({
        where: { id: { in: [firstId, secondId] } },
      });
    }
  });

  test("预览后的分类规格定义变化会拒绝过期确认", async () => {
    const partNumber = "TQ-IMP-STALE-CATALOG";
    const bytes = await workbookBytes((workbook) => {
      addFuelProduct(workbook, {
        name: "Stale catalog candidate",
        partNumber,
        slug: "stale-catalog-candidate",
      });
    });
    const preview = await previewProductImport({
      actor: contentEditor,
      file: {
        bytes,
        declaredMimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        originalFilename: "stale-catalog.xlsx",
      },
      prisma,
    });
    const definition =
      await prisma.specificationAttributeDefinition.findUniqueOrThrow({
        select: { nameZhCn: true },
        where: { id: "specification-fuel-outer_diameter" },
      });

    try {
      await prisma.specificationAttributeDefinition.update({
        data: { nameZhCn: "预览后变化的外径" },
        where: { id: "specification-fuel-outer_diameter" },
      });

      await expect(
        confirmProductImport({
          actor: contentEditor,
          previewId: preview.id,
          prisma,
        }),
      ).rejects.toMatchObject({ code: "PREVIEW_STALE" });
      await expect(
        prisma.product.count({
          where: { normalizedPartNumber: "TQIMPSTALECATALOG" },
        }),
      ).resolves.toBe(0);
    } finally {
      await prisma.specificationAttributeDefinition.update({
        data: { nameZhCn: definition.nameZhCn },
        where: { id: "specification-fuel-outer_diameter" },
      });
      await prisma.productImportPreview.delete({ where: { id: preview.id } });
    }
  });

  test("预览后草稿被发布时即使版本未变化也会拒绝确认", async () => {
    const productId = "product-ticket-16-stale-published";
    const partNumber = "TQ-IMP-STALE-PUBLISHED";
    await createExistingImportDraft({ id: productId, partNumber, version: 3 });
    const bytes = await workbookBytes((workbook) => {
      addFuelProduct(workbook, {
        name: "Published stale candidate",
        partNumber,
        slug: "published-stale-candidate",
      });
    });
    const preview = await previewProductImport({
      actor: contentEditor,
      file: {
        bytes,
        declaredMimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        originalFilename: "stale-published-preview.xlsx",
      },
      prisma,
    });

    try {
      await prisma.productDraft.update({
        data: { lastPublishedVersion: 3 },
        where: { productId },
      });

      await expect(
        confirmProductImport({
          actor: contentEditor,
          previewId: preview.id,
          prisma,
        }),
      ).rejects.toMatchObject({ code: "PREVIEW_STALE" });
      await expect(
        prisma.productImportBatch.count({ where: { previewId: preview.id } }),
      ).resolves.toBe(0);
    } finally {
      await prisma.productImportPreview.delete({ where: { id: preview.id } });
      await prisma.product.delete({ where: { id: productId } });
    }
  });
});

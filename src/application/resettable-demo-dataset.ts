import type { Prisma } from "@/src/generated/prisma/client";
import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";
import {
  clearTemporaryUploads,
  regenerateDemoAssets,
} from "@/src/infrastructure/local-demo/generated-assets";
import {
  replaceCatalogIdentities,
  seedCatalogIdentities,
  seedCatalogProductLifecycleDemoData,
  seedProductReferenceDemoData,
} from "@/src/modules/catalog/server/catalog-demo-data";
import {
  replaceVehicleFitmentDemoData,
  seedVehicleFitmentDemoData,
} from "@/src/modules/catalog/server/fitment-demo-data";
import { seedSpecificationDemoData } from "@/src/modules/catalog/server/specification-demo-data";
import { resetDemoAssetRecords } from "@/src/modules/content-publishing/server/asset-demo-data";
import { seedProductDraftDemoData } from "@/src/modules/content-publishing/server/product-draft-demo-data";
import { seedPublishedProductContent } from "@/src/modules/content-publishing/server/product-demo-content";
import {
  replaceSiteContent,
  seedSiteContent,
} from "@/src/modules/content-publishing/server/site-content-demo-data";
import {
  replacePresetAccounts,
  seedPresetAccounts,
} from "@/src/modules/identity-access/server/preset-accounts";
import type { PresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";
import { seedInquiryDemoData } from "@/src/modules/inquiry-operations/server/inquiry-demo-data";
import { seedNotificationDemoData } from "@/src/modules/notifications/server/notification-demo-data";
import {
  replaceDemoData,
  seedDemoData,
} from "@/src/modules/site-config/server/local-demo-data";

import { replaceInquiryAndNotificationData } from "./inquiry-demo-reset";
import { captureProductDraftSnapshot } from "./product-import";

const invalidPreviewId = "19000000-0000-4000-8000-000000000001";
const conflictPreviewId = "19000000-0000-4000-8000-000000000002";
const conflictBatchId = "19000000-0000-4000-8000-000000000003";
const conflictProductId = "product-tq-af-2201";
const contentEditorId = "demo-user-content_editor";
const demoTimestamp = new Date("2026-08-17T04:00:00.000Z");
const conflictTimestamp = new Date("2026-08-17T05:00:00.000Z");
const emptyPayload = {
  catalogFingerprint: "0".repeat(64),
  products: [],
  replacementGraphFingerprint: "1".repeat(64),
};

export type DemoDatasetFileLocations = {
  generatedAssetsDirectory?: string;
  sourceAssetsDirectory?: string;
  uploadsDirectory?: string;
};

async function clearProductImportData(
  prisma: ApplicationDatabase,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.productImportBatch.deleteMany();
    await transaction.productImportPreview.deleteMany();
  });
}

async function seedProductImportDemoData(
  prisma: ApplicationDatabase,
): Promise<void> {
  if (
    (await prisma.productImportPreview.count({
      where: { id: { in: [invalidPreviewId, conflictPreviewId] } },
    })) > 0
  ) {
    return;
  }

  await prisma.$transaction(async (transaction) => {
    const beforeSnapshot = await captureProductDraftSnapshot(
      transaction,
      conflictProductId,
    );
    if (!beforeSnapshot) {
      throw new Error("The demo import-conflict product draft is missing.");
    }
    const currentProduct = await transaction.product.findUniqueOrThrow({
      select: { currentPublicationId: true },
      where: { id: conflictProductId },
    });
    await transaction.productDraft.update({
      data: {
        lastModifiedByUserId: contentEditorId,
        summaryZhCn: "由固定演示导入批次更新的产品草稿。",
        updatedAt: demoTimestamp,
        version: 2,
      },
      where: { productId: conflictProductId },
    });
    const afterSnapshot = await captureProductDraftSnapshot(
      transaction,
      conflictProductId,
    );
    if (!afterSnapshot) {
      throw new Error("The imported demo product draft snapshot is missing.");
    }

    await transaction.productImportPreview.create({
      data: {
        addedCount: 0,
        affectedProductCount: 1,
        createdAt: demoTimestamp,
        createdByUserId: contentEditorId,
        errors: [
          {
            code: "CATEGORY_NOT_FOUND",
            field: "分类代码",
            issue: "演示分类代码不存在。",
            row: 2,
            sheet: "产品",
            suggestion: "改为 air、oil、fuel 或 cabin。",
          },
          {
            code: "TRANSLATION_MISSING",
            field: "语言",
            issue: "缺少简体中文翻译行。",
            row: 2,
            sheet: "翻译",
            suggestion: "为同一产品编号补充 zh-CN 翻译。",
          },
          {
            code: "FITMENT_YEAR_RANGE_INVALID",
            field: "起始年份/结束年份",
            issue: "起始年份晚于结束年份。",
            row: 2,
            sheet: "适配关系",
            suggestion: "按从早到晚的顺序填写年份边界。",
          },
        ],
        fileHash: "demo-invalid-import-workbook",
        id: invalidPreviewId,
        originalFilename: "torquelis-demo-validation-errors.xlsx",
        payload: emptyPayload,
        status: "pending",
        updatedCount: 1,
      },
    });
    await transaction.productImportPreview.create({
      data: {
        addedCount: 0,
        affectedProductCount: 1,
        createdAt: demoTimestamp,
        createdByUserId: contentEditorId,
        errors: [],
        fileHash: "demo-conflicting-import-workbook",
        id: conflictPreviewId,
        originalFilename: "torquelis-demo-rollback-conflict.xlsx",
        payload: emptyPayload,
        status: "confirmed",
        updatedCount: 1,
      },
    });
    await transaction.productImportBatch.create({
      data: {
        addedCount: 0,
        affectedProductCount: 1,
        batchNumber: 1,
        createdAt: demoTimestamp,
        createdByUserId: contentEditorId,
        fileHash: "demo-conflicting-import-workbook",
        id: conflictBatchId,
        originalFilename: "torquelis-demo-rollback-conflict.xlsx",
        previewId: conflictPreviewId,
        updatedCount: 1,
      },
    });
    await transaction.productImportBatchItem.create({
      data: {
        afterDraftSnapshot: afterSnapshot as unknown as Prisma.InputJsonValue,
        afterDraftVersion: 2,
        batchId: conflictBatchId,
        beforeDraftSnapshot: beforeSnapshot as unknown as Prisma.InputJsonValue,
        beforeDraftVersion: 1,
        partNumber: "TQ-AF-2201",
        productId: conflictProductId,
        productWasCreated: false,
        publicationIdAtImport: currentProduct.currentPublicationId,
      },
    });
    await transaction.productDraft.update({
      data: {
        lastModifiedByUserId: contentEditorId,
        summaryZhCn: "导入后人工修改，用于固定展示整批撤销冲突。",
        updatedAt: conflictTimestamp,
        version: 3,
      },
      where: { productId: conflictProductId },
    });
    await transaction.auditLog.createMany({
      data: [
        {
          actorRole: "content_editor",
          actorUserId: contentEditorId,
          createdAt: demoTimestamp,
          event: "PRODUCT_IMPORT_CONFIRMED",
          id: "demo-audit-import-confirmed",
          outcome: "SUCCESS",
          summary: "更新 1 个演示草稿；未自动发布。",
          targetId: conflictBatchId,
          targetType: "ProductImportBatch",
        },
        {
          actorRole: "content_editor",
          actorUserId: contentEditorId,
          createdAt: conflictTimestamp,
          event: "PRODUCT_DRAFT_UPDATED",
          id: "demo-audit-import-conflict-edit",
          outcome: "SUCCESS",
          summary: "导入后继续编辑演示草稿，用于展示撤销冲突。",
          targetId: conflictProductId,
          targetType: "PRODUCT",
        },
      ],
    });
    await transaction.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('product_import_batch', 'batch_number'), 1, true)`,
    );
  });
}

async function seedDatabaseDataset({
  credentials,
  prisma,
}: {
  credentials: PresetCredentials;
  prisma: ApplicationDatabase;
}): Promise<void> {
  await seedDemoData(prisma);
  await resetDemoAssetRecords(prisma);
  await seedCatalogIdentities(prisma);
  await seedPublishedProductContent(prisma);
  await seedCatalogProductLifecycleDemoData(prisma);
  await seedProductReferenceDemoData(prisma);
  await seedSpecificationDemoData(prisma);
  await seedVehicleFitmentDemoData(prisma);
  await seedProductDraftDemoData(prisma);
  await seedSiteContent(prisma);
  await seedPresetAccounts(prisma, credentials);
  const notificationTargets = await seedInquiryDemoData(prisma);
  await seedNotificationDemoData(prisma, notificationTargets);
  await seedProductImportDemoData(prisma);
}

export async function initializeDemoDataset({
  credentials,
  prisma,
}: {
  credentials: PresetCredentials;
  prisma: ApplicationDatabase;
}): Promise<void> {
  const [
    productCount,
    articleCount,
    inquirySubmissionCount,
    importPreviewCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.article.count(),
    prisma.inquirySubmission.count(),
    prisma.productImportPreview.count(),
  ]);
  const isEmpty =
    productCount === 0 &&
    articleCount === 0 &&
    inquirySubmissionCount === 0 &&
    importPreviewCount === 0;
  const isCompleteDemoDataset =
    productCount === 50 &&
    articleCount === 8 &&
    inquirySubmissionCount === 20 &&
    importPreviewCount === 2;

  if (isCompleteDemoDataset) return;
  if (!isEmpty) {
    throw new Error(
      "The database already contains a partial or runtime dataset. Run the verified demo reset instead of merging seed data into it.",
    );
  }
  await seedDatabaseDataset({ credentials, prisma });
}

export async function resetDemoDataset({
  credentials,
  fileLocations = {},
  prisma,
}: {
  credentials: PresetCredentials;
  fileLocations?: DemoDatasetFileLocations;
  prisma: ApplicationDatabase;
}): Promise<void> {
  await replaceDemoData(prisma);
  await replaceInquiryAndNotificationData(prisma);
  await clearProductImportData(prisma);
  await replaceCatalogIdentities(prisma);
  await resetDemoAssetRecords(prisma);
  await seedPublishedProductContent(prisma);
  await seedCatalogProductLifecycleDemoData(prisma);
  await seedProductReferenceDemoData(prisma);
  await seedSpecificationDemoData(prisma);
  await replaceVehicleFitmentDemoData(prisma);
  await seedProductDraftDemoData(prisma);
  await replaceSiteContent(prisma);
  await replacePresetAccounts(prisma, credentials);
  const notificationTargets = await seedInquiryDemoData(prisma);
  await seedNotificationDemoData(prisma, notificationTargets);
  await seedProductImportDemoData(prisma);
  await clearTemporaryUploads(fileLocations.uploadsDirectory);
  await regenerateDemoAssets({
    generatedDirectory: fileLocations.generatedAssetsDirectory,
    sourceDirectory: fileLocations.sourceAssetsDirectory,
  });
}

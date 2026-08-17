import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getProductImportBatch } from "@/src/application/product-import";
import { findPublishedProductsByVehicle } from "@/src/application/public-catalog";
import {
  initializeDemoDataset,
  resetDemoDataset,
} from "@/src/application/resettable-demo-dataset";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import {
  ensurePresetCredentials,
  type PresetCredentials,
} from "@/src/modules/identity-access/server/preset-credentials";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);
let credentials: PresetCredentials;
let localStateDirectory: string;
let generatedAssetsDirectory: string;
let uploadsDirectory: string;

async function reset() {
  await resetDemoDataset({
    credentials,
    fileLocations: {
      generatedAssetsDirectory,
      sourceAssetsDirectory: path.join(
        process.cwd(),
        "product-ui",
        "public",
        "assets",
      ),
      uploadsDirectory,
    },
    prisma,
  });
}

async function businessSnapshot() {
  const [
    categories,
    products,
    productDrafts,
    productDraftReferences,
    productDraftFitments,
    publications,
    references,
    specificationDefinitions,
    specificationOptions,
    specificationValues,
    draftSpecificationValues,
    fitments,
    makes,
    models,
    engines,
    articles,
    articleDrafts,
    articlePublications,
    corePages,
    corePageDrafts,
    corePagePublications,
    inquiries,
    inquiryAssignments,
    inquiryFollowUps,
    inquiryStatusChanges,
    quarantinedInquiries,
    notifications,
    auditLogs,
    users,
    siteConfigurations,
    previews,
    batches,
    batchItems,
    assets,
  ] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: { id: "asc" } }),
    prisma.product.findMany({
      orderBy: { id: "asc" },
      select: {
        categoryId: true,
        currentPublicationId: true,
        id: true,
        partNumber: true,
        replacementProductId: true,
        status: true,
      },
    }),
    prisma.productDraft.findMany({
      orderBy: { productId: "asc" },
      select: {
        lastModifiedByUserId: true,
        lastPublishedVersion: true,
        productId: true,
        status: true,
        summaryZhCn: true,
        version: true,
      },
    }),
    prisma.productDraftReference.findMany({
      orderBy: { id: "asc" },
    }),
    prisma.productDraftFitment.findMany({
      orderBy: { id: "asc" },
    }),
    prisma.productPublication.findMany({
      orderBy: { id: "asc" },
      select: { id: true, productId: true, status: true, version: true },
    }),
    prisma.productReference.findMany({
      orderBy: { id: "asc" },
      select: {
        brand: true,
        id: true,
        publicationId: true,
        referenceNumber: true,
      },
    }),
    prisma.specificationAttributeDefinition.findMany({
      orderBy: { id: "asc" },
    }),
    prisma.specificationAttributeOption.findMany({
      orderBy: [{ attributeId: "asc" }, { code: "asc" }],
    }),
    prisma.productSpecificationValue.findMany({
      orderBy: [{ publicationId: "asc" }, { attributeId: "asc" }],
    }),
    prisma.productDraftSpecificationValue.findMany({
      orderBy: [{ productId: "asc" }, { attributeId: "asc" }],
    }),
    prisma.productFitment.findMany({
      orderBy: { id: "asc" },
      select: {
        engineId: true,
        id: true,
        publicationId: true,
        vehicleModelId: true,
        yearFrom: true,
        yearTo: true,
      },
    }),
    prisma.vehicleMake.findMany({ orderBy: { id: "asc" } }),
    prisma.vehicleModel.findMany({ orderBy: { id: "asc" } }),
    prisma.engine.findMany({ orderBy: { id: "asc" } }),
    prisma.article.findMany({ orderBy: { id: "asc" } }),
    prisma.articleDraft.findMany({
      orderBy: [{ articleId: "asc" }, { locale: "asc" }],
    }),
    prisma.articlePublication.findMany({
      orderBy: [{ articleId: "asc" }, { locale: "asc" }],
      select: { articleId: true, id: true, locale: true, version: true },
    }),
    prisma.corePage.findMany({ orderBy: { key: "asc" } }),
    prisma.corePageDraft.findMany({ orderBy: { pageKey: "asc" } }),
    prisma.corePagePublication.findMany({
      orderBy: [{ pageKey: "asc" }, { version: "asc" }],
    }),
    prisma.inquiry.findMany({
      orderBy: { referenceNumber: "asc" },
      select: {
        closeResult: true,
        currentOwnerId: true,
        id: true,
        nextStepDate: true,
        referenceNumber: true,
        sourcePage: true,
        status: true,
        version: true,
      },
    }),
    prisma.inquiryAssignment.findMany({ orderBy: { id: "asc" } }),
    prisma.inquiryFollowUp.findMany({ orderBy: { id: "asc" } }),
    prisma.inquiryStatusChange.findMany({ orderBy: { id: "asc" } }),
    prisma.quarantinedInquiry.findMany({
      orderBy: { referenceNumber: "asc" },
      select: {
        id: true,
        referenceNumber: true,
        sourcePage: true,
        spamReasons: true,
      },
    }),
    prisma.notificationOutboxRecord.findMany({ orderBy: { id: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { id: "asc" } }),
    prisma.user.findMany({
      orderBy: { id: "asc" },
      select: {
        email: true,
        emailVerified: true,
        id: true,
        name: true,
        role: true,
      },
    }),
    prisma.siteConfiguration.findMany({ orderBy: { key: "asc" } }),
    prisma.productImportPreview.findMany({
      orderBy: { id: "asc" },
      select: {
        affectedProductCount: true,
        errors: true,
        id: true,
        originalFilename: true,
        status: true,
      },
    }),
    prisma.productImportBatch.findMany({
      orderBy: { id: "asc" },
      select: {
        affectedProductCount: true,
        batchNumber: true,
        id: true,
        previewId: true,
      },
    }),
    prisma.productImportBatchItem.findMany({
      orderBy: [{ batchId: "asc" }, { productId: "asc" }],
    }),
    prisma.asset.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        publicPath: true,
        source: true,
        storageFilename: true,
      },
    }),
  ]);

  return JSON.parse(
    JSON.stringify({
      articleDrafts,
      articlePublications,
      articles,
      assets,
      auditLogs,
      batchItems,
      batches,
      categories,
      corePageDrafts,
      corePagePublications,
      corePages,
      draftSpecificationValues,
      engines,
      fitments,
      inquiryAssignments,
      inquiryFollowUps,
      inquiryStatusChanges,
      inquiries,
      makes,
      models,
      notifications,
      previews,
      products,
      productDraftFitments,
      productDraftReferences,
      productDrafts,
      publications,
      quarantinedInquiries,
      references,
      siteConfigurations,
      specificationDefinitions,
      specificationOptions,
      specificationValues,
      users,
    }),
  );
}

describe("完整可重置演示数据集", () => {
  beforeAll(async () => {
    credentials = await ensurePresetCredentials();
    localStateDirectory = await mkdtemp(
      path.join(tmpdir(), "torquelis-demo-reset-"),
    );
    generatedAssetsDirectory = path.join(localStateDirectory, "generated");
    uploadsDirectory = path.join(localStateDirectory, "uploads");
    await reset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await rm(localStateDirectory, { force: true, recursive: true });
  });

  it("固定生成完整目录、双语文章和运营询盘边界", async () => {
    const [
      categoryCount,
      productCount,
      makeCount,
      modelCount,
      engineCount,
      fitmentCount,
      articles,
      inquiryCount,
      quarantinedCount,
      referenceCounts,
    ] = await Promise.all([
      prisma.productCategory.count(),
      prisma.product.count(),
      prisma.vehicleMake.count(),
      prisma.vehicleModel.count(),
      prisma.engine.count(),
      prisma.productFitment.count(),
      prisma.article.findMany({
        include: { publications: { select: { locale: true } } },
        orderBy: { topicKey: "asc" },
      }),
      prisma.inquiry.count(),
      prisma.quarantinedInquiry.count(),
      prisma.product.findMany({
        include: {
          currentPublication: {
            select: { _count: { select: { references: true } } },
          },
          draft: { select: { _count: { select: { references: true } } } },
        },
        orderBy: { partNumber: "asc" },
      }),
    ]);

    expect({
      categoryCount,
      engineCount,
      makeCount,
      modelCount,
      productCount,
    }).toEqual({
      categoryCount: 4,
      engineCount: 12,
      makeCount: 6,
      modelCount: 12,
      productCount: 50,
    });
    expect(fitmentCount).toBeGreaterThanOrEqual(145);
    expect(fitmentCount).toBeLessThanOrEqual(155);
    expect(
      referenceCounts.every((product) => {
        const count =
          product.currentPublication?._count.references ??
          product.draft?._count.references ??
          0;
        return count >= 2 && count <= 4;
      }),
    ).toBe(true);

    expect(articles).toHaveLength(8);
    expect(
      articles.filter(({ publications }) => publications.length === 2),
    ).toHaveLength(6);
    expect(
      articles
        .filter(({ publications }) => publications.length === 1)
        .every(({ publications }) => publications[0]?.locale === "en"),
    ).toBe(true);

    expect(inquiryCount + quarantinedCount).toBe(20);
    expect(quarantinedCount).toBeGreaterThan(0);
    const statusGroups = await prisma.inquiry.groupBy({
      _count: { _all: true },
      by: ["status"],
    });
    expect(statusGroups.map(({ status }) => status).sort()).toEqual([
      "assigned",
      "closed",
      "in_progress",
      "pending_assignment",
      "quoted",
    ]);
    expect(
      await prisma.inquiry.count({
        where: {
          nextStepDate: { lte: new Date("2026-08-17T00:00:00.000Z") },
          status: { not: "closed" },
        },
      }),
    ).toBeGreaterThan(0);
    const datedInquiries = await prisma.inquiry.findMany({
      select: { nextStepDate: true, submittedAt: true },
      where: { nextStepDate: { not: null } },
    });
    expect(
      datedInquiries.every(
        ({ nextStepDate, submittedAt }) => nextStepDate! >= submittedAt,
      ),
    ).toBe(true);
    expect(
      (
        await prisma.inquiry.groupBy({
          _count: { _all: true },
          by: ["closeResult"],
          where: { closeResult: { not: null } },
        })
      )
        .map(({ closeResult }) => closeResult)
        .sort(),
    ).toEqual(["invalid", "lost", "won"]);
  });

  it("固定数据不存在悬空或错配的跨表引用", async () => {
    const danglingReferences = await prisma.$queryRaw<
      { relation: string; dangling_count: bigint }[]
    >`
      SELECT 'product_current_publication' AS relation, COUNT(*) AS dangling_count
      FROM product p
      LEFT JOIN product_publication pp
        ON pp.id = p.current_publication_id AND pp.product_id = p.id
      WHERE p.current_publication_id IS NOT NULL AND pp.id IS NULL
      UNION ALL
      SELECT 'publication_children', COUNT(*)
      FROM (
        SELECT pr.publication_id FROM product_reference pr
        LEFT JOIN product_publication pp ON pp.id = pr.publication_id
        WHERE pp.id IS NULL
        UNION ALL
        SELECT sv.publication_id FROM product_specification_value sv
        LEFT JOIN product_publication pp ON pp.id = sv.publication_id
        WHERE pp.id IS NULL
        UNION ALL
        SELECT pf.publication_id FROM product_fitment pf
        LEFT JOIN product_publication pp ON pp.id = pf.publication_id
        WHERE pp.id IS NULL
      ) dangling_publication_child
      UNION ALL
      SELECT 'fitment_engine_model', COUNT(*)
      FROM product_fitment pf
      LEFT JOIN engine e
        ON e.id = pf.engine_id AND e.vehicle_model_id = pf.vehicle_model_id
      WHERE e.id IS NULL
      UNION ALL
      SELECT 'inquiry_submission', COUNT(*)
      FROM inquiry i
      LEFT JOIN inquiry_submission s ON s.id = i.submission_id
      WHERE s.id IS NULL OR s.disposition <> 'accepted'
      UNION ALL
      SELECT 'quarantined_submission', COUNT(*)
      FROM quarantined_inquiry qi
      LEFT JOIN inquiry_submission s ON s.id = qi.submission_id
      WHERE s.id IS NULL OR s.disposition <> 'quarantined'
      UNION ALL
      SELECT 'inquiry_history', COUNT(*)
      FROM (
        SELECT ia.inquiry_id FROM inquiry_assignment ia
        LEFT JOIN inquiry i ON i.id = ia.inquiry_id
        WHERE i.id IS NULL
        UNION ALL
        SELECT f.inquiry_id FROM inquiry_follow_up f
        LEFT JOIN inquiry i ON i.id = f.inquiry_id
        WHERE i.id IS NULL
        UNION ALL
        SELECT sc.inquiry_id FROM inquiry_status_change sc
        LEFT JOIN inquiry i ON i.id = sc.inquiry_id
        WHERE i.id IS NULL
        UNION ALL
        SELECT n.inquiry_id FROM notification_outbox_record n
        LEFT JOIN inquiry i ON i.id = n.inquiry_id
        WHERE i.id IS NULL
      ) dangling_inquiry_child
      UNION ALL
      SELECT 'content_current_publication', COUNT(*)
      FROM (
        SELECT cp.key::text AS owner_id
        FROM core_page cp
        LEFT JOIN core_page_publication cpp
          ON cpp.id = cp.current_publication_id AND cpp.page_key = cp.key
        WHERE cp.current_publication_id IS NOT NULL AND cpp.id IS NULL
        UNION ALL
        SELECT ad.article_id
        FROM article_draft ad
        LEFT JOIN article_publication ap
          ON ap.id = ad.current_publication_id
          AND ap.article_id = ad.article_id
          AND ap.locale = ad.locale
        WHERE ad.current_publication_id IS NOT NULL AND ap.id IS NULL
      ) dangling_content_publication
    `;

    expect(
      danglingReferences.map(({ dangling_count, relation }) => ({
        count: Number(dangling_count),
        relation,
      })),
    ).toEqual([
      { count: 0, relation: "product_current_publication" },
      { count: 0, relation: "publication_children" },
      { count: 0, relation: "fitment_engine_model" },
      { count: 0, relation: "inquiry_submission" },
      { count: 0, relation: "quarantined_submission" },
      { count: 0, relation: "inquiry_history" },
      { count: 0, relation: "content_current_publication" },
    ]);
  });

  it("显式保留查找、停产、导入错误和撤销冲突演示路径", async () => {
    const [ambiguousReferenceCount, withReplacement, withoutReplacement] =
      await Promise.all([
        prisma.productReference.count({
          where: { normalizedReferenceNumber: "ARV4400" },
        }),
        prisma.product.findUniqueOrThrow({
          where: { id: "product-tq-fl-4720" },
        }),
        prisma.product.findUniqueOrThrow({
          where: { id: "product-tq-af-2000" },
        }),
      ]);
    expect(ambiguousReferenceCount).toBe(2);
    expect(withReplacement).toMatchObject({
      replacementProductId: "product-tq-fl-4827",
      status: "discontinued",
    });
    expect(withoutReplacement).toMatchObject({
      replacementProductId: null,
      status: "discontinued",
    });

    const uniqueFitment = await findPublishedProductsByVehicle({
      locale: "en",
      prisma,
      selection: {
        categoryCode: "fuel",
        engineId: "engine-n13-420",
        makeId: "make-northline",
        modelId: "model-northline-hx9",
        year: 2022,
      },
    });
    expect(uniqueFitment.map(({ partNumber }) => partNumber)).toEqual([
      "TQ-FL-4827",
    ]);

    const invalidPreview = await prisma.productImportPreview.findFirstOrThrow({
      where: { errors: { not: [] } },
    });
    expect(invalidPreview.errors).toEqual(expect.any(Array));

    const contentEditor = await prisma.user.findFirstOrThrow({
      where: { role: APP_ROLES.CONTENT_EDITOR },
    });
    const actor: AdminActor = {
      id: contentEditor.id,
      name: contentEditor.name,
      role: contentEditor.role,
    };
    const conflictBatch = await prisma.productImportBatch.findFirstOrThrow();
    await expect(
      getProductImportBatch({ actor, batchId: conflictBatch.id, prisma }),
    ).resolves.toMatchObject({
      rollbackConflicts: [
        expect.objectContaining({
          partNumber: "TQ-AF-2201",
          reasons: ["MODIFIED_AFTER_IMPORT"],
        }),
      ],
      rollbackStatus: "conflict",
    });
  });

  it("清除运行期业务数据与临时上传，并在连续重置后恢复同一状态", async () => {
    await prisma.siteConfiguration.update({
      data: { companyNameEn: "Runtime mutation" },
      where: { key: "primary" },
    });
    await prisma.productImportPreview.create({
      data: {
        addedCount: 0,
        affectedProductCount: 0,
        createdByUserId: "demo-user-content_editor",
        errors: [],
        fileHash: "runtime-preview",
        id: "19000000-0000-4000-8000-000000000099",
        originalFilename: "runtime.xlsx",
        payload: {},
        updatedCount: 0,
      },
    });
    await writeFile(
      path.join(uploadsDirectory, "runtime-upload.png"),
      "runtime",
    );

    await reset();
    const first = await businessSnapshot();
    expect(
      await prisma.productImportPreview.findUnique({
        where: { id: "19000000-0000-4000-8000-000000000099" },
      }),
    ).toBeNull();
    expect(
      await prisma.siteConfiguration.findUniqueOrThrow({
        where: { key: "primary" },
      }),
    ).toMatchObject({ companyNameEn: "Torquelis Filters" });
    await expect(
      readFile(path.join(uploadsDirectory, "runtime-upload.png")),
    ).rejects.toMatchObject({ code: "ENOENT" });

    await initializeDemoDataset({ credentials, prisma });
    expect(await businessSnapshot()).toEqual(first);

    await reset();
    expect(await businessSnapshot()).toEqual(first);
    expect(
      JSON.parse(
        await readFile(
          path.join(generatedAssetsDirectory, "manifest.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({
      source: "product-ui/public/assets",
      usage: "Fictional Torquelis demo assets",
    });
  });
});

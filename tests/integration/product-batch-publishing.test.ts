import { afterAll, describe, expect, test } from "vitest";

import {
  previewProductPublishingBatch,
  publishProductDraft,
  publishProductDraftBatch,
} from "@/src/application/product-publishing";
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

async function createPublishableDraft({
  id,
  name,
  partNumber,
}: {
  id: string;
  name: string;
  partNumber: string;
}) {
  const source = await prisma.productDraft.findUniqueOrThrow({
    include: {
      references: true,
      specificationValues: true,
    },
    where: { productId: "product-tq-fl-4827" },
  });
  const {
    productId: ignoredProductId,
    references,
    specificationValues,
    updatedAt: ignoredUpdatedAt,
    ...draft
  } = source;
  void ignoredProductId;
  void ignoredUpdatedAt;

  await prisma.product.create({
    data: {
      categoryId: source.categoryId,
      draft: {
        create: {
          ...draft,
          lastModifiedByUserId: contentEditor.id,
          lastPublishedVersion: null,
          nameEn: name,
          nameZhCn: `${name} 中文`,
          references: {
            create: references.map(({ brand }, index) => ({
              brand,
              referenceNumber: `${partNumber}-REF-${index + 1}`,
            })),
          },
          seoTitleEn: `${name} | Torquelis Filters`,
          seoTitleZhCn: `${name} 中文｜拓擎利滤清`,
          slugEn: name.toLocaleLowerCase().replaceAll(" ", "-"),
          slugZhCn: `${name.toLocaleLowerCase().replaceAll(" ", "-")}-zh-cn`,
          specificationValues: {
            create: specificationValues.map(
              ({ productId: ignoredSpecificationProductId, ...value }) => {
                void ignoredSpecificationProductId;
                return value;
              },
            ),
          },
          version: 1,
        },
      },
      id,
      imagePath: source.imagePath,
      partNumber,
      status: "draft",
    },
  });
}

async function cleanupProducts(productIds: string[]) {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      "SET LOCAL torquelis.allow_product_publication_mutation = 'on'",
    );
    await transaction.auditLog.deleteMany({
      where: {
        OR: [
          { targetId: { in: productIds } },
          {
            event: {
              in: ["PRODUCT_BATCH_PUBLISHED", "PRODUCT_BATCH_PUBLISH_REJECTED"],
            },
            summary: { contains: "TQ-BULK" },
          },
        ],
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
    await transaction.productDraft.updateMany({
      data: { replacementProductId: null },
      where: { productId: { in: productIds } },
    });
    await transaction.productPublication.deleteMany({
      where: { productId: { in: productIds } },
    });
    await transaction.product.deleteMany({
      where: { id: { in: productIds } },
    });
  });
}

describe("产品草稿批量发布", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("全部草稿先通过发布预览后才在一个事务中批量形成不可变版本", async () => {
    const products = [
      {
        id: "product-ticket-17-bulk-success-1",
        name: "Bulk publish first",
        partNumber: "TQ-BULK-SUCCESS-1",
      },
      {
        id: "product-ticket-17-bulk-success-2",
        name: "Bulk publish second",
        partNumber: "TQ-BULK-SUCCESS-2",
      },
    ];
    for (const product of products) await createPublishableDraft(product);
    const selections = products.map(({ partNumber }) => ({
      expectedDraftVersion: 1,
      partNumber,
    }));

    try {
      await expect(
        previewProductPublishingBatch({
          actor: contentEditor,
          prisma,
          selections,
        }),
      ).resolves.toMatchObject({
        allReady: true,
        items: [
          expect.objectContaining({
            partNumber: products[0].partNumber,
            status: "ready",
          }),
          expect.objectContaining({
            partNumber: products[1].partNumber,
            status: "ready",
          }),
        ],
      });

      await expect(
        publishProductDraftBatch({
          actor: contentEditor,
          now: new Date("2026-08-15T09:00:00.000Z"),
          prisma,
          selections,
        }),
      ).resolves.toMatchObject({
        publications: [
          expect.objectContaining({ partNumber: products[0].partNumber }),
          expect.objectContaining({ partNumber: products[1].partNumber }),
        ],
        publishedCount: 2,
      });

      await expect(
        prisma.product.findMany({
          orderBy: { partNumber: "asc" },
          select: {
            currentPublicationId: true,
            draft: { select: { lastPublishedVersion: true } },
            publications: {
              select: { sealedAt: true, sourceDraftVersion: true },
            },
          },
          where: { id: { in: products.map(({ id }) => id) } },
        }),
      ).resolves.toEqual([
        {
          currentPublicationId: expect.any(String),
          draft: { lastPublishedVersion: 1 },
          publications: [
            {
              sealedAt: new Date("2026-08-15T09:00:00.000Z"),
              sourceDraftVersion: 1,
            },
          ],
        },
        {
          currentPublicationId: expect.any(String),
          draft: { lastPublishedVersion: 1 },
          publications: [
            {
              sealedAt: new Date("2026-08-15T09:00:00.000Z"),
              sourceDraftVersion: 1,
            },
          ],
        },
      ]);
      await expect(
        prisma.auditLog.findFirst({
          where: {
            event: "PRODUCT_BATCH_PUBLISHED",
            outcome: "SUCCESS",
            summary: { contains: products[0].partNumber },
          },
        }),
      ).resolves.toMatchObject({
        summary: expect.stringContaining(products[1].partNumber),
      });
    } finally {
      await cleanupProducts(products.map(({ id }) => id));
    }
  });

  test("任一草稿校验失败都会阻止全部所选产品并记录拒绝审计", async () => {
    const products = [
      {
        id: "product-ticket-17-bulk-validation-1",
        name: "Bulk validation first",
        partNumber: "TQ-BULK-VALIDATION-1",
      },
      {
        id: "product-ticket-17-bulk-validation-2",
        name: "Bulk validation second",
        partNumber: "TQ-BULK-VALIDATION-2",
      },
    ];
    for (const product of products) await createPublishableDraft(product);
    await prisma.productDraft.update({
      data: { nameZhCn: "" },
      where: { productId: products[1].id },
    });
    const selections = products.map(({ partNumber }) => ({
      expectedDraftVersion: 1,
      partNumber,
    }));

    try {
      const preview = await previewProductPublishingBatch({
        actor: contentEditor,
        prisma,
        selections,
      });
      expect(preview).toMatchObject({
        allReady: false,
        items: [
          expect.objectContaining({ status: "ready" }),
          expect.objectContaining({
            fieldErrors: expect.arrayContaining([
              expect.objectContaining({ field: "nameZhCn" }),
            ]),
            partNumber: products[1].partNumber,
            status: "invalid",
          }),
        ],
      });

      await expect(
        publishProductDraftBatch({
          actor: contentEditor,
          prisma,
          selections,
        }),
      ).rejects.toMatchObject({
        code: "VALIDATION_FAILED",
        preview: expect.objectContaining({ allReady: false }),
      });
      await expect(
        prisma.productPublication.count({
          where: { productId: { in: products.map(({ id }) => id) } },
        }),
      ).resolves.toBe(0);
      await expect(
        prisma.auditLog.findFirst({
          where: {
            event: "PRODUCT_BATCH_PUBLISH_REJECTED",
            outcome: "VALIDATION",
            summary: { contains: products[0].partNumber },
          },
        }),
      ).resolves.toMatchObject({
        summary: expect.stringContaining(products[1].partNumber),
      });
    } finally {
      await cleanupProducts(products.map(({ id }) => id));
    }
  });

  test("发布预览后出现草稿版本冲突时整批不发布", async () => {
    const products = [
      {
        id: "product-ticket-17-bulk-conflict-1",
        name: "Bulk conflict first",
        partNumber: "TQ-BULK-CONFLICT-1",
      },
      {
        id: "product-ticket-17-bulk-conflict-2",
        name: "Bulk conflict second",
        partNumber: "TQ-BULK-CONFLICT-2",
      },
    ];
    for (const product of products) await createPublishableDraft(product);
    const selections = products.map(({ partNumber }) => ({
      expectedDraftVersion: 1,
      partNumber,
    }));

    try {
      await expect(
        previewProductPublishingBatch({
          actor: contentEditor,
          prisma,
          selections,
        }),
      ).resolves.toMatchObject({ allReady: true });
      await prisma.productDraft.update({
        data: {
          lastModifiedByUserId: contentEditor.id,
          summaryZhCn: "发布预览后的修改。",
          version: { increment: 1 },
        },
        where: { productId: products[1].id },
      });

      await expect(
        publishProductDraftBatch({
          actor: contentEditor,
          prisma,
          selections,
        }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        name: "ProductBatchPublishingError",
      });
      await expect(
        prisma.productPublication.count({
          where: { productId: { in: products.map(({ id }) => id) } },
        }),
      ).resolves.toBe(0);
      await expect(
        prisma.auditLog.count({
          where: {
            event: "PRODUCT_BATCH_PUBLISH_REJECTED",
            outcome: "CONFLICT",
            summary: { contains: products[1].partNumber },
          },
        }),
      ).resolves.toBe(1);
    } finally {
      await cleanupProducts(products.map(({ id }) => id));
    }
  });

  test("并发重复批量发布只有一个成功且不会产生重复发布版本", async () => {
    const products = [
      {
        id: "product-ticket-17-bulk-concurrent-1",
        name: "Bulk concurrent first",
        partNumber: "TQ-BULK-CONCURRENT-1",
      },
      {
        id: "product-ticket-17-bulk-concurrent-2",
        name: "Bulk concurrent second",
        partNumber: "TQ-BULK-CONCURRENT-2",
      },
    ];
    for (const product of products) await createPublishableDraft(product);
    const selections = products.map(({ partNumber }) => ({
      expectedDraftVersion: 1,
      partNumber,
    }));

    try {
      const attempts = await Promise.allSettled([
        publishProductDraftBatch({
          actor: contentEditor,
          now: new Date("2026-08-15T10:00:00.000Z"),
          prisma,
          selections,
        }),
        publishProductDraftBatch({
          actor: contentEditor,
          now: new Date("2026-08-15T10:00:01.000Z"),
          prisma,
          selections,
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
      ).toMatchObject({ code: "NOTHING_TO_PUBLISH" });
      await expect(
        prisma.productPublication.count({
          where: { productId: { in: products.map(({ id }) => id) } },
        }),
      ).resolves.toBe(2);
      await expect(
        prisma.auditLog.findMany({
          select: { event: true, outcome: true },
          where: {
            event: {
              in: ["PRODUCT_BATCH_PUBLISHED", "PRODUCT_BATCH_PUBLISH_REJECTED"],
            },
            summary: { contains: products[0].partNumber },
          },
        }),
      ).resolves.toEqual(
        expect.arrayContaining([
          { event: "PRODUCT_BATCH_PUBLISHED", outcome: "SUCCESS" },
          { event: "PRODUCT_BATCH_PUBLISH_REJECTED", outcome: "DUPLICATE" },
        ]),
      );
    } finally {
      await cleanupProducts(products.map(({ id }) => id));
    }
  });

  test("批量发布预览按整批最终替代关系拒绝循环", async () => {
    const products = [
      {
        id: "product-ticket-17-bulk-cycle-1",
        name: "Bulk cycle first",
        partNumber: "TQ-BULK-CYCLE-1",
      },
      {
        id: "product-ticket-17-bulk-cycle-2",
        name: "Bulk cycle second",
        partNumber: "TQ-BULK-CYCLE-2",
      },
    ];
    for (const product of products) await createPublishableDraft(product);

    try {
      for (const product of products) {
        await publishProductDraft({
          actor: contentEditor,
          expectedDraftVersion: 1,
          partNumber: product.partNumber,
          prisma,
        });
      }
      await prisma.$transaction([
        prisma.productDraft.update({
          data: {
            lastModifiedByUserId: contentEditor.id,
            replacementProductId: products[1].id,
            status: "discontinued",
            version: 2,
          },
          where: { productId: products[0].id },
        }),
        prisma.productDraft.update({
          data: {
            lastModifiedByUserId: contentEditor.id,
            replacementProductId: products[0].id,
            status: "discontinued",
            version: 2,
          },
          where: { productId: products[1].id },
        }),
      ]);
      const selections = products.map(({ partNumber }) => ({
        expectedDraftVersion: 2,
        partNumber,
      }));

      await expect(
        previewProductPublishingBatch({
          actor: contentEditor,
          prisma,
          selections,
        }),
      ).resolves.toMatchObject({
        allReady: false,
        items: [
          expect.objectContaining({
            fieldErrors: expect.arrayContaining([
              expect.objectContaining({ reason: "REPLACEMENT_CYCLE" }),
            ]),
            status: "invalid",
          }),
          expect.objectContaining({
            fieldErrors: expect.arrayContaining([
              expect.objectContaining({ reason: "REPLACEMENT_CYCLE" }),
            ]),
            status: "invalid",
          }),
        ],
      });
      await expect(
        publishProductDraftBatch({
          actor: contentEditor,
          prisma,
          selections,
        }),
      ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
      await expect(
        prisma.productPublication.count({
          where: { productId: { in: products.map(({ id }) => id) } },
        }),
      ).resolves.toBe(2);
    } finally {
      await cleanupProducts(products.map(({ id }) => id));
    }
  });

  test("批量发布按整批最终替代关系允许解除旧边后的合法替代链", async () => {
    const products = [
      {
        id: "product-ticket-17-bulk-rewire-1",
        name: "Bulk rewire first",
        partNumber: "TQ-BULK-REWIRE-1",
      },
      {
        id: "product-ticket-17-bulk-rewire-2",
        name: "Bulk rewire second",
        partNumber: "TQ-BULK-REWIRE-2",
      },
    ];
    for (const product of products) await createPublishableDraft(product);

    try {
      await publishProductDraft({
        actor: contentEditor,
        expectedDraftVersion: 1,
        partNumber: products[1].partNumber,
        prisma,
      });
      await prisma.productDraft.update({
        data: {
          replacementProductId: products[1].id,
          status: "discontinued",
        },
        where: { productId: products[0].id },
      });
      await publishProductDraft({
        actor: contentEditor,
        expectedDraftVersion: 1,
        partNumber: products[0].partNumber,
        prisma,
      });
      await prisma.$transaction([
        prisma.productDraft.update({
          data: {
            lastModifiedByUserId: contentEditor.id,
            replacementProductId: null,
            status: "published",
            version: 2,
          },
          where: { productId: products[0].id },
        }),
        prisma.productDraft.update({
          data: {
            lastModifiedByUserId: contentEditor.id,
            replacementProductId: products[0].id,
            status: "discontinued",
            version: 2,
          },
          where: { productId: products[1].id },
        }),
      ]);
      const selections = products.map(({ partNumber }) => ({
        expectedDraftVersion: 2,
        partNumber,
      }));

      await expect(
        previewProductPublishingBatch({
          actor: contentEditor,
          prisma,
          selections,
        }),
      ).resolves.toMatchObject({
        allReady: true,
        items: [
          expect.objectContaining({ status: "ready" }),
          expect.objectContaining({ status: "ready" }),
        ],
      });
      await expect(
        publishProductDraftBatch({
          actor: contentEditor,
          prisma,
          selections,
        }),
      ).resolves.toMatchObject({ publishedCount: 2 });
      await expect(
        prisma.product.findMany({
          orderBy: { partNumber: "asc" },
          select: { id: true, replacementProductId: true },
          where: { id: { in: products.map(({ id }) => id) } },
        }),
      ).resolves.toEqual([
        { id: products[0].id, replacementProductId: null },
        { id: products[1].id, replacementProductId: products[0].id },
      ]);
    } finally {
      await cleanupProducts(products.map(({ id }) => id));
    }
  });
});

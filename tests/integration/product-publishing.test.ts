import { afterAll, describe, expect, it } from "vitest";

import { getPublishedProduct } from "@/src/application/public-catalog";
import {
  deleteNeverPublishedProductDraft,
  getProductDraft,
  publishProductDraft,
  restoreProductPublication,
  saveProductDraft,
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
const administrator: AdminActor = {
  id: "demo-user-administrator",
  name: "陈屿",
  role: "administrator",
};

function editableInput(
  draft: Awaited<ReturnType<typeof getProductDraft>>,
  overrides: Partial<Parameters<typeof saveProductDraft>[0]["input"]> = {},
): Parameters<typeof saveProductDraft>[0]["input"] {
  return {
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
    replacementPartNumber: draft.replacementProduct?.partNumber ?? null,
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
    status: draft.status === "discontinued" ? "discontinued" : "published",
    summaryEn: draft.summaryEn,
    summaryZhCn: draft.summaryZhCn,
    ...overrides,
  };
}

describe("产品草稿发布", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("缺失中文公开字段的草稿不能发布", async () => {
    const draft = await getProductDraft({
      actor: contentEditor,
      partNumber: "TQ-DF-9000",
      prisma,
    });

    try {
      await prisma.productDraft.update({
        data: { imagePath: "" },
        where: { productId: draft.productId },
      });
      await expect(
        publishProductDraft({
          actor: contentEditor,
          expectedDraftVersion: draft.version,
          partNumber: "TQ-DF-9000",
          prisma,
        }),
      ).rejects.toMatchObject({
        code: "PUBLISH_VALIDATION_FAILED",
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({ field: "imagePath" }),
          expect.objectContaining({ field: "nameZhCn" }),
        ]),
      });
    } finally {
      await prisma.productDraft.update({
        data: { imagePath: draft.imagePath },
        where: { productId: draft.productId },
      });
    }
  });

  it("保存完整草稿后首次发布才改变前台公开表示", async () => {
    const original = await getProductDraft({
      actor: contentEditor,
      partNumber: "TQ-DF-9000",
      prisma,
    });
    let publicationId: string | undefined;

    try {
      const saved = await saveProductDraft({
        actor: contentEditor,
        expectedDraftVersion: original.version,
        input: {
          categoryId: "category-fuel",
          descriptionEn:
            "A complete fictional fuel filter draft used to verify controlled publishing.",
          descriptionZhCn: "用于验证受控发布流程的完整虚构燃油滤清器草稿。",
          fitmentSummaryEn: "Selected Northline commercial vehicles.",
          fitmentSummaryZhCn: "适用于指定 Northline 商用车型。",
          imageAltEn: "Demonstration fuel filter",
          imageAltZhCn: "演示燃油滤清器",
          imagePath: "/assets/fuel-filter-product.png",
          nameEn: "Draft Fuel Filter",
          nameZhCn: "草稿燃油滤清器",
          references: [{ brand: "Novera", referenceNumber: "NDF-9000" }],
          replacementPartNumber: null,
          seoDescriptionEn: "Draft fuel filter publishing demonstration.",
          seoDescriptionZhCn: "草稿燃油滤清器发布演示。",
          seoTitleEn: "Draft Fuel Filter | Torquelis Filters",
          seoTitleZhCn: "草稿燃油滤清器｜拓擎利滤清",
          slugEn: "draft-fuel-filter",
          slugZhCn: "草稿燃油滤清器",
          specifications: [
            { attributeCode: "construction_type", value: "spin_on" },
            {
              attributeCode: "outer_diameter",
              unit: "millimetre",
              value: 98,
            },
            {
              attributeCode: "height",
              unit: "millimetre",
              value: 180,
            },
            { attributeCode: "connection_specification", value: "M18 × 1.5" },
            {
              attributeCode: "filtration_rating",
              unit: "micrometre",
              value: 8,
            },
            {
              attributeCode: "rated_flow",
              unit: "litre_per_minute",
              value: 5.8,
            },
            { attributeCode: "water_separation", value: true },
          ],
          status: "published",
          summaryEn:
            "Complete draft content that is not public before publishing.",
          summaryZhCn: "发布前不会公开的完整草稿内容。",
        },
        now: new Date("2026-08-14T08:00:00.000Z"),
        partNumber: "TQ-DF-9000",
        prisma,
      });

      await expect(
        getPublishedProduct({
          locale: "en",
          partNumber: "TQ-DF-9000",
          prisma,
        }),
      ).resolves.toBeNull();

      await prisma.productDraftSpecificationValue.update({
        data: { decimalValue: 999_999 },
        where: {
          productId_attributeId: {
            attributeId: "specification-fuel-outer_diameter",
            productId: original.productId,
          },
        },
      });
      await expect(
        publishProductDraft({
          actor: contentEditor,
          expectedDraftVersion: saved.version,
          partNumber: "TQ-DF-9000",
          prisma,
        }),
      ).rejects.toMatchObject({
        code: "PUBLISH_VALIDATION_FAILED",
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({ field: "specifications" }),
        ]),
      });
      await prisma.productDraftSpecificationValue.update({
        data: { decimalValue: 98 },
        where: {
          productId_attributeId: {
            attributeId: "specification-fuel-outer_diameter",
            productId: original.productId,
          },
        },
      });

      const published = await publishProductDraft({
        actor: contentEditor,
        expectedDraftVersion: saved.version,
        now: new Date("2026-08-14T08:05:00.000Z"),
        partNumber: "TQ-DF-9000",
        prisma,
      });
      publicationId = published.publicationId;

      await expect(
        getPublishedProduct({
          locale: "en",
          partNumber: "TQ-DF-9000",
          prisma,
        }),
      ).resolves.toMatchObject({
        name: "Draft Fuel Filter",
        specifications: expect.arrayContaining([
          expect.objectContaining({ label: "Outer diameter", value: "98" }),
        ]),
        status: "published",
      });
      await expect(
        prisma.productPublication.findUniqueOrThrow({
          include: { references: true, specificationValues: true },
          where: { id: publicationId },
        }),
      ).resolves.toMatchObject({
        descriptionZhCn: "用于验证受控发布流程的完整虚构燃油滤清器草稿。",
        fitmentSummaryEn: "Selected Northline commercial vehicles.",
        references: [{ brand: "Novera", referenceNumber: "NDF-9000" }],
        seoTitleEn: "Draft Fuel Filter | Torquelis Filters",
        sealedAt: new Date("2026-08-14T08:05:00.000Z"),
        sourceDraftVersion: saved.version,
        specificationValues: expect.arrayContaining([
          expect.objectContaining({ attributeCode: "outer_diameter" }),
        ]),
        version: 1,
      });
      await expect(
        prisma.productPublication.update({
          data: { summaryEn: "A sealed version must reject this update." },
          where: { id: publicationId },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.productReference.create({
          data: {
            brand: "Blocked",
            id: "reference-sealed-insert-blocked",
            publicationId,
            referenceNumber: "BLOCKED-1",
          },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.productReference.deleteMany({ where: { publicationId } }),
      ).rejects.toThrow();
      await expect(
        prisma.productReference.updateMany({
          data: { brand: "Blocked" },
          where: { publicationId },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.auditLog.findFirst({
          orderBy: { createdAt: "desc" },
          where: { event: "PRODUCT_PUBLISHED", targetId: original.productId },
        }),
      ).resolves.toMatchObject({
        actorUserId: contentEditor.id,
        outcome: "SUCCESS",
      });
    } finally {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`
          SELECT set_config(
            'torquelis.allow_product_publication_mutation',
            'on',
            true
          )
        `;
        await transaction.product.update({
          data: {
            categoryId: original.categoryId,
            currentPublicationId: null,
            imagePath: original.imagePath,
            replacementProductId: null,
            status: "draft",
          },
          where: { id: original.productId },
        });
        if (publicationId) {
          await transaction.productPublication.delete({
            where: { id: publicationId },
          });
        }
        await transaction.auditLog.deleteMany({
          where: {
            event: "PRODUCT_PUBLISHED",
            targetId: original.productId,
          },
        });
        await transaction.productDraftSpecificationValue.deleteMany({
          where: { productId: original.productId },
        });
        await transaction.productDraftReference.deleteMany({
          where: { productId: original.productId },
        });
        await transaction.productDraft.update({
          data: {
            categoryId: original.categoryId,
            descriptionEn: original.descriptionEn,
            descriptionZhCn: original.descriptionZhCn,
            fitmentSummaryEn: original.fitmentSummaryEn,
            fitmentSummaryZhCn: original.fitmentSummaryZhCn,
            imageAltEn: original.imageAltEn,
            imageAltZhCn: original.imageAltZhCn,
            imagePath: original.imagePath,
            lastModifiedByUserId: original.lastModifiedByUserId,
            lastPublishedVersion: original.lastPublishedVersion,
            nameEn: original.nameEn,
            nameZhCn: original.nameZhCn,
            replacementProductId: original.replacementProductId,
            restoredFromPublicationId: original.restoredFromPublicationId,
            seoDescriptionEn: original.seoDescriptionEn,
            seoDescriptionZhCn: original.seoDescriptionZhCn,
            seoTitleEn: original.seoTitleEn,
            seoTitleZhCn: original.seoTitleZhCn,
            slugEn: original.slugEn,
            slugZhCn: original.slugZhCn,
            status: original.status,
            summaryEn: original.summaryEn,
            summaryZhCn: original.summaryZhCn,
            updatedAt: original.updatedAt,
            version: original.version,
          },
          where: { productId: original.productId },
        });
      });
    }
  });

  it("再次发布保留旧版本，恢复旧版本只创建草稿并在重新发布后生效", async () => {
    const original = await getProductDraft({
      actor: contentEditor,
      partNumber: "TQ-FL-4827",
      prisma,
    });
    const createdPublicationIds: string[] = [];

    try {
      const savedV2 = await saveProductDraft({
        actor: contentEditor,
        expectedDraftVersion: original.version,
        input: editableInput(original, {
          nameEn: "Version Two Fuel Filter",
          seoTitleEn: "Version Two Fuel Filter | Torquelis Filters",
          slugEn: "version-two-fuel-filter",
          summaryEn: "The second immutable public representation.",
        }),
        now: new Date("2026-08-14T09:00:00.000Z"),
        partNumber: original.partNumber,
        prisma,
      });
      const v2 = await publishProductDraft({
        actor: contentEditor,
        expectedDraftVersion: savedV2.version,
        now: new Date("2026-08-14T09:05:00.000Z"),
        partNumber: original.partNumber,
        prisma,
      });
      createdPublicationIds.push(v2.publicationId);

      await expect(
        prisma.productPublication.findUniqueOrThrow({
          where: { id: original.currentPublicationId! },
        }),
      ).resolves.toMatchObject({
        nameEn: "High-Efficiency Fuel Filter",
        version: 1,
      });
      await expect(
        getPublishedProduct({
          locale: "en",
          partNumber: original.partNumber,
          prisma,
        }),
      ).resolves.toMatchObject({ name: "Version Two Fuel Filter" });
      await expect(
        prisma.productPublication.delete({
          where: { id: original.currentPublicationId! },
        }),
      ).rejects.toThrow();

      const restored = await restoreProductPublication({
        actor: contentEditor,
        expectedDraftVersion: savedV2.version,
        now: new Date("2026-08-14T09:10:00.000Z"),
        partNumber: original.partNumber,
        prisma,
        publicationId: original.currentPublicationId!,
      });

      await expect(
        getPublishedProduct({
          locale: "en",
          partNumber: original.partNumber,
          prisma,
        }),
      ).resolves.toMatchObject({ name: "Version Two Fuel Filter" });
      await expect(
        getProductDraft({
          actor: contentEditor,
          partNumber: original.partNumber,
          prisma,
        }),
      ).resolves.toMatchObject({
        nameEn: "High-Efficiency Fuel Filter",
        restoredFromPublicationId: original.currentPublicationId,
        version: restored.version,
      });

      const v3 = await publishProductDraft({
        actor: contentEditor,
        expectedDraftVersion: restored.version,
        now: new Date("2026-08-14T09:15:00.000Z"),
        partNumber: original.partNumber,
        prisma,
      });
      createdPublicationIds.push(v3.publicationId);

      await expect(
        getPublishedProduct({
          locale: "en",
          partNumber: original.partNumber,
          prisma,
        }),
      ).resolves.toMatchObject({ name: "High-Efficiency Fuel Filter" });
      await expect(
        prisma.productPublication.findUniqueOrThrow({
          where: { id: v3.publicationId },
        }),
      ).resolves.toMatchObject({
        restoredFromPublicationId: original.currentPublicationId,
        version: 3,
      });
    } finally {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`
          SELECT set_config(
            'torquelis.allow_product_publication_mutation',
            'on',
            true
          )
        `;
        await transaction.product.update({
          data: {
            categoryId: original.categoryId,
            currentPublicationId: original.currentPublicationId,
            imagePath: original.imagePath,
            replacementProductId: original.replacementProductId,
            status: original.productStatus,
          },
          where: { id: original.productId },
        });
        if (createdPublicationIds.length > 0) {
          await transaction.productPublication.deleteMany({
            where: { id: { in: createdPublicationIds } },
          });
        }
        await transaction.auditLog.deleteMany({
          where: {
            event: {
              in: ["PRODUCT_PUBLISHED", "PRODUCT_PUBLICATION_RESTORED"],
            },
            targetId: original.productId,
          },
        });
        await transaction.productDraftSpecificationValue.deleteMany({
          where: { productId: original.productId },
        });
        await transaction.productDraftReference.deleteMany({
          where: { productId: original.productId },
        });
        await transaction.productDraftFitment.deleteMany({
          where: { productId: original.productId },
        });
        await transaction.productDraft.update({
          data: {
            categoryId: original.categoryId,
            descriptionEn: original.descriptionEn,
            descriptionZhCn: original.descriptionZhCn,
            fitmentSummaryEn: original.fitmentSummaryEn,
            fitmentSummaryZhCn: original.fitmentSummaryZhCn,
            imageAltEn: original.imageAltEn,
            imageAltZhCn: original.imageAltZhCn,
            imagePath: original.imagePath,
            lastModifiedByUserId: original.lastModifiedByUserId,
            lastPublishedVersion: original.lastPublishedVersion,
            nameEn: original.nameEn,
            nameZhCn: original.nameZhCn,
            replacementProductId: original.replacementProductId,
            restoredFromPublicationId: original.restoredFromPublicationId,
            seoDescriptionEn: original.seoDescriptionEn,
            seoDescriptionZhCn: original.seoDescriptionZhCn,
            seoTitleEn: original.seoTitleEn,
            seoTitleZhCn: original.seoTitleZhCn,
            slugEn: original.slugEn,
            slugZhCn: original.slugZhCn,
            status: original.status,
            summaryEn: original.summaryEn,
            summaryZhCn: original.summaryZhCn,
            updatedAt: original.updatedAt,
            version: original.version,
          },
          where: { productId: original.productId },
        });
        if (original.specificationValues.length > 0) {
          await transaction.productDraftSpecificationValue.createMany({
            data: original.specificationValues.map(
              ({ productId, ...value }) => {
                void productId;
                return { ...value, productId: original.productId };
              },
            ),
          });
        }
        if (original.references.length > 0) {
          await transaction.productDraftReference.createMany({
            data: original.references.map(({ brand, referenceNumber }) => ({
              brand,
              productId: original.productId,
              referenceNumber,
            })),
          });
        }
        if (original.fitments.length > 0) {
          await transaction.productDraftFitment.createMany({
            data: original.fitments.map(
              ({ engineId, vehicleModelId, yearFrom, yearTo }) => ({
                engineId,
                productId: original.productId,
                vehicleModelId,
                yearFrom,
                yearTo,
              }),
            ),
          });
        }
      });
    }
  });

  it("两个窗口同时保存时旧草稿版本被拒绝并返回最新修改人和时间", async () => {
    const original = await getProductDraft({
      actor: contentEditor,
      partNumber: "TQ-FL-4827",
      prisma,
    });
    const attempts = [
      {
        actor: contentEditor,
        now: new Date("2026-08-14T10:00:00.000Z"),
        summary: "由内容编辑窗口保存的草稿。",
      },
      {
        actor: administrator,
        now: new Date("2026-08-14T10:01:00.000Z"),
        summary: "由管理员窗口保存的草稿。",
      },
    ] as const;

    try {
      const results = await Promise.allSettled(
        attempts.map((attempt) =>
          saveProductDraft({
            actor: attempt.actor,
            expectedDraftVersion: original.version,
            input: editableInput(original, {
              summaryZhCn: attempt.summary,
            }),
            now: attempt.now,
            partNumber: original.partNumber,
            prisma,
          }),
        ),
      );
      const winnerIndex = results.findIndex(
        (result) => result.status === "fulfilled",
      );
      const loser = results.find((result) => result.status === "rejected");

      expect(
        results.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect((loser as PromiseRejectedResult).reason).toMatchObject({
        code: "CONFLICT",
        conflict: {
          latestModifiedAt: attempts[winnerIndex].now,
          latestModifiedBy: attempts[winnerIndex].actor.name,
          latestVersion: original.version + 1,
        },
      });
    } finally {
      await prisma.$transaction(async (transaction) => {
        await transaction.productDraftSpecificationValue.deleteMany({
          where: { productId: original.productId },
        });
        await transaction.productDraftReference.deleteMany({
          where: { productId: original.productId },
        });
        await transaction.productDraft.update({
          data: {
            categoryId: original.categoryId,
            descriptionEn: original.descriptionEn,
            descriptionZhCn: original.descriptionZhCn,
            fitmentSummaryEn: original.fitmentSummaryEn,
            fitmentSummaryZhCn: original.fitmentSummaryZhCn,
            imageAltEn: original.imageAltEn,
            imageAltZhCn: original.imageAltZhCn,
            imagePath: original.imagePath,
            lastModifiedByUserId: original.lastModifiedByUserId,
            lastPublishedVersion: original.lastPublishedVersion,
            nameEn: original.nameEn,
            nameZhCn: original.nameZhCn,
            replacementProductId: original.replacementProductId,
            restoredFromPublicationId: original.restoredFromPublicationId,
            seoDescriptionEn: original.seoDescriptionEn,
            seoDescriptionZhCn: original.seoDescriptionZhCn,
            seoTitleEn: original.seoTitleEn,
            seoTitleZhCn: original.seoTitleZhCn,
            slugEn: original.slugEn,
            slugZhCn: original.slugZhCn,
            status: original.status,
            summaryEn: original.summaryEn,
            summaryZhCn: original.summaryZhCn,
            updatedAt: original.updatedAt,
            version: original.version,
          },
          where: { productId: original.productId },
        });
        await transaction.productDraftSpecificationValue.createMany({
          data: original.specificationValues.map(({ productId, ...value }) => {
            void productId;
            return { ...value, productId: original.productId };
          }),
        });
        await transaction.productDraftReference.createMany({
          data: original.references.map(({ brand, referenceNumber }) => ({
            brand,
            productId: original.productId,
            referenceNumber,
          })),
        });
      });
    }
  });

  it("只有从未发布且无引用和历史的草稿可以永久删除", async () => {
    const partNumber = "TQ-DELETE-1300";

    await prisma.product.create({
      data: {
        categoryId: "category-air",
        draft: {
          create: {
            categoryId: "category-air",
            descriptionEn: "",
            descriptionZhCn: "",
            fitmentSummaryEn: "",
            fitmentSummaryZhCn: "",
            imageAltEn: "",
            imageAltZhCn: "",
            imagePath: "/assets/filter-family.png",
            nameEn: "",
            nameZhCn: "",
            seoDescriptionEn: "",
            seoDescriptionZhCn: "",
            seoTitleEn: "",
            seoTitleZhCn: "",
            slugEn: "",
            slugZhCn: "",
            status: "published",
            summaryEn: "",
            summaryZhCn: "",
          },
        },
        id: "product-delete-ticket-13",
        imagePath: "/assets/filter-family.png",
        partNumber,
      },
    });

    try {
      await expect(
        deleteNeverPublishedProductDraft({
          actor: contentEditor,
          expectedDraftVersion: 1,
          partNumber,
          prisma,
        }),
      ).resolves.toEqual({ deletedPartNumber: partNumber });
      await expect(
        prisma.product.findUnique({
          where: { id: "product-delete-ticket-13" },
        }),
      ).resolves.toBeNull();

      const published = await getProductDraft({
        actor: contentEditor,
        partNumber: "TQ-FL-4827",
        prisma,
      });
      await expect(
        deleteNeverPublishedProductDraft({
          actor: contentEditor,
          expectedDraftVersion: published.version,
          partNumber: published.partNumber,
          prisma,
        }),
      ).rejects.toMatchObject({ code: "HARD_DELETE_FORBIDDEN" });
    } finally {
      await prisma.product.deleteMany({
        where: { id: "product-delete-ticket-13" },
      });
    }
  });
});

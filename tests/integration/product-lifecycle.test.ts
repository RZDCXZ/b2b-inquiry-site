import { afterAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { setProductLifecycle } from "@/src/modules/catalog/server/product-lifecycle-service";
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

describe("标准替换件生命周期", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("已停产产品可以关联并移除一个有效替代产品", async () => {
    const before = await prisma.product.findUniqueOrThrow({
      include: { draft: true },
      where: { normalizedPartNumber: "TQAF2000" },
    });

    try {
      await expect(
        setProductLifecycle({
          actor: contentEditor,
          expectedDraftVersion: before.draft?.version ?? 1,
          partNumber: "TQ-AF-2000",
          prisma,
          replacementPartNumber: "tq af 2106",
          status: "discontinued",
        }),
      ).resolves.toEqual({
        partNumber: "TQ-AF-2000",
        replacementPartNumber: "TQ-AF-2106",
        status: "discontinued",
      });
      await expect(
        prisma.product.findUniqueOrThrow({
          include: { draft: true },
          where: { id: before.id },
        }),
      ).resolves.toMatchObject({
        replacementProductId: before.replacementProductId,
        status: before.status,
        draft: {
          lastModifiedByUserId: contentEditor.id,
          replacementProductId: "product-tq-af-2106",
          status: "discontinued",
          version: (before.draft?.version ?? 0) + 1,
        },
      });
      await expect(
        setProductLifecycle({
          actor: contentEditor,
          expectedDraftVersion: before.draft?.version ?? 1,
          partNumber: "TQ-AF-2000",
          prisma,
          status: "discontinued",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    } finally {
      const latest = await prisma.productDraft.findUniqueOrThrow({
        where: { productId: before.id },
      });
      await setProductLifecycle({
        actor: contentEditor,
        expectedDraftVersion: latest.version,
        partNumber: "TQ-AF-2000",
        prisma,
        status: "discontinued",
      });
      await prisma.productDraft.update({
        data: {
          replacementProductId: before.draft?.replacementProductId ?? null,
          lastModifiedByUserId: before.draft?.lastModifiedByUserId ?? null,
          status: before.draft?.status ?? "discontinued",
          version: before.draft?.version ?? 1,
        },
        where: { productId: before.id },
      });
    }
  });

  it("替代产品不能指向自身", async () => {
    await expect(
      setProductLifecycle({
        actor: contentEditor,
        expectedDraftVersion: 1,
        partNumber: "TQ-FL-4720",
        prisma,
        replacementPartNumber: "tq fl 4720",
        status: "discontinued",
      }),
    ).rejects.toMatchObject({ code: "REPLACEMENT_SELF_REFERENCE" });
  });

  it("替代关系不能形成循环", async () => {
    await expect(
      setProductLifecycle({
        actor: contentEditor,
        expectedDraftVersion: 1,
        partNumber: "TQ-FL-4827",
        prisma,
        replacementPartNumber: "TQ-FL-4720",
        status: "discontinued",
      }),
    ).rejects.toMatchObject({ code: "REPLACEMENT_CYCLE" });
  });

  it("生命周期适配层不会把无关规格错误误报为替代产品错误", async () => {
    const product = await prisma.product.findUniqueOrThrow({
      include: {
        draft: {
          include: {
            specificationValues: {
              where: { dataType: "decimal" },
            },
          },
        },
      },
      where: { normalizedPartNumber: "TQAF2106" },
    });
    const specification = product.draft?.specificationValues[0];
    expect(specification).toBeDefined();

    try {
      await prisma.productDraftSpecificationValue.update({
        data: { decimalValue: 999_999 },
        where: {
          productId_attributeId: {
            attributeId: specification!.attributeId,
            productId: product.id,
          },
        },
      });
      await expect(
        setProductLifecycle({
          actor: contentEditor,
          expectedDraftVersion: product.draft?.version ?? 1,
          partNumber: product.partNumber,
          prisma,
          status: "published",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_DRAFT",
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({ field: "specifications" }),
        ]),
      });
    } finally {
      await prisma.productDraftSpecificationValue.update({
        data: { decimalValue: specification!.decimalValue },
        where: {
          productId_attributeId: {
            attributeId: specification!.attributeId,
            productId: product.id,
          },
        },
      });
    }
  });
});

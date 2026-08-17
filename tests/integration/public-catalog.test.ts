import { afterAll, describe, expect, it } from "vitest";

import {
  getPublishedProduct,
  listPublishedProducts,
} from "@/src/application/public-catalog";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { seedPublishedProductContent } from "@/src/modules/content-publishing/server/product-demo-content";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);

describe("双语标准替换件目录", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("英文目录只返回四类已发布产品并按产品编号稳定排序", async () => {
    const products = await listPublishedProducts({ locale: "en", prisma });

    expect(products).toHaveLength(47);
    expect([...new Set(products.map(({ category }) => category.code))]).toEqual(
      ["air", "cabin", "fuel", "oil"],
    );
    for (const categoryCode of ["air", "cabin", "fuel", "oil"] as const) {
      const partNumbers = products
        .filter(({ category }) => category.code === categoryCode)
        .map(({ partNumber }) => partNumber);
      expect(partNumbers).toEqual([...partNumbers].sort());
    }
    expect(products).toContainEqual(
      expect.objectContaining({ partNumber: "TQ-AF-2201" }),
    );
    expect(products).not.toContainEqual(
      expect.objectContaining({ partNumber: "TQ-DF-9000" }),
    );
  });

  it("用语言无关产品身份读取双语详情并生成同实体语言地址", async () => {
    const [english, chinese] = await Promise.all([
      getPublishedProduct({
        locale: "en",
        partNumber: "tq fl 4827",
        prisma,
      }),
      getPublishedProduct({
        locale: "zh-cn",
        partNumber: "TQ-FL-4827",
        prisma,
      }),
    ]);

    expect(english).toMatchObject({
      href: "/en/products/TQ-FL-4827/high-efficiency-fuel-filter",
      name: "High-Efficiency Fuel Filter",
      partNumber: "TQ-FL-4827",
    });
    expect(chinese).toMatchObject({
      href: "/zh-cn/products/TQ-FL-4827/%E9%AB%98%E6%95%88%E7%87%83%E6%B2%B9%E6%BB%A4%E6%B8%85%E5%99%A8",
      name: "高效燃油滤清器",
      partNumber: "TQ-FL-4827",
    });
    expect(english?.id).toBe(chinese?.id);
    expect(english?.languageHrefs["zh-cn"]).toBe(chinese?.href);
    expect(chinese?.languageHrefs.en).toBe(english?.href);
  });

  it("公开详情只读取当前不可变发布快照而不读取可变产品投影", async () => {
    const original = await prisma.product.findUniqueOrThrow({
      where: { id: "product-tq-fl-4827" },
    });

    try {
      await prisma.product.update({
        data: {
          categoryId: "category-air",
          imagePath: "/assets/filter-family.png",
          replacementProductId: "product-tq-af-2106",
          status: "discontinued",
        },
        where: { id: original.id },
      });

      await expect(
        getPublishedProduct({
          locale: "en",
          partNumber: original.partNumber,
          prisma,
        }),
      ).resolves.toMatchObject({
        category: { code: "fuel" },
        imagePath: "/assets/fuel-filter-product.png",
        replacement: null,
        status: "published",
      });
    } finally {
      await prisma.product.update({
        data: {
          categoryId: original.categoryId,
          imagePath: original.imagePath,
          replacementProductId: original.replacementProductId,
          status: original.status,
        },
        where: { id: original.id },
      });
    }
  });

  it("已停产产品保留双语历史详情但不进入默认目录，并按当前语言提供可选替代产品", async () => {
    const [catalogue, englishWithReplacement, chineseWithoutReplacement] =
      await Promise.all([
        listPublishedProducts({ locale: "en", prisma }),
        getPublishedProduct({
          locale: "en",
          partNumber: "TQ-FL-4720",
          prisma,
        }),
        getPublishedProduct({
          locale: "zh-cn",
          partNumber: "TQ-AF-2000",
          prisma,
        }),
      ]);

    expect(catalogue.map(({ partNumber }) => partNumber)).not.toContain(
      "TQ-FL-4720",
    );
    expect(catalogue.map(({ partNumber }) => partNumber)).not.toContain(
      "TQ-AF-2000",
    );
    expect(englishWithReplacement).toMatchObject({
      href: "/en/products/TQ-FL-4720/legacy-fuel-filter",
      replacement: {
        href: "/en/products/TQ-FL-4827/high-efficiency-fuel-filter",
        partNumber: "TQ-FL-4827",
      },
      status: "discontinued",
    });
    expect(englishWithReplacement?.specifications.length).toBeGreaterThan(0);
    expect(chineseWithoutReplacement).toMatchObject({
      href: "/zh-cn/products/TQ-AF-2000/%E5%8E%86%E5%8F%B2%E7%A9%BA%E6%B0%94%E6%BB%A4%E6%B8%85%E5%99%A8",
      replacement: null,
      status: "discontinued",
    });
    expect(chineseWithoutReplacement?.specifications.length).toBeGreaterThan(0);
  });

  it("数据库拒绝标准化后重复的产品编号", async () => {
    await expect(
      prisma.product.create({
        data: {
          categoryId: "category-air",
          id: "product-normalized-duplicate",
          imagePath: "/assets/filter-family.png",
          partNumber: "tq af 2106",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("重复载入演示数据不会覆盖或复制不可变发布快照", async () => {
    await seedPublishedProductContent(prisma);
    await seedPublishedProductContent(prisma);

    const publications = await prisma.productPublication.findMany({
      orderBy: { productId: "asc" },
      select: { productId: true, version: true },
    });

    expect(publications).toHaveLength(49);
    expect(publications.every(({ version }) => version === 1)).toBe(true);
  });

  it("数据库拒绝把其他标准替换件的发布快照设为当前内容", async () => {
    const mismatchedPublicationId = "publication-product-tq-fl-4827-v2-test";
    await prisma.productPublication.create({
      data: {
        categoryId: "category-fuel",
        id: mismatchedPublicationId,
        imagePath: "/assets/fuel-filter-product.png",
        nameEn: "Fuel publication ownership fixture",
        nameZhCn: "燃油发布归属测试数据",
        productId: "product-tq-fl-4827",
        slugEn: "fuel-publication-ownership-fixture",
        slugZhCn: "燃油发布归属测试数据",
        summaryEn: "Integration-only immutable publication fixture.",
        summaryZhCn: "仅用于集成测试的不可变发布数据。",
        version: 2,
      },
    });

    try {
      await expect(
        prisma.product.update({
          data: { currentPublicationId: mismatchedPublicationId },
          where: { id: "product-tq-af-2106" },
        }),
      ).rejects.toMatchObject({ code: "P2003" });
    } finally {
      await prisma.productPublication.delete({
        where: { id: mismatchedPublicationId },
      });
    }
  });
});

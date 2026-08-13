import { afterAll, describe, expect, it } from "vitest";

import {
  listSpecificationFilterDefinitions,
  searchPublishedProductsBySpecifications,
} from "@/src/application/public-catalog";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);

describe("可分享的分类规格筛选", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("只公开当前分类中标记为可筛选的规格属性", async () => {
    const definitions = await listSpecificationFilterDefinitions({
      categoryCode: "fuel",
      locale: "en",
      prisma,
    });

    expect(definitions.map(({ code }) => code)).toEqual([
      "construction_type",
      "outer_diameter",
      "height",
      "filtration_rating",
      "rated_flow",
      "water_separation",
    ]);
    expect(definitions).not.toContainEqual(
      expect.objectContaining({ code: "connection_specification" }),
    );
    expect(definitions).not.toContainEqual(
      expect.objectContaining({ code: "thread_specification" }),
    );
  });

  it("用公制基准范围筛选当前分类的已发布产品", async () => {
    const productId = "product-tq-fl-4999-range-filter-test";
    const publicationId = "publication-tq-fl-4999-range-filter-test-v1";

    await prisma.product.create({
      data: {
        categoryId: "category-fuel",
        id: productId,
        imagePath: "/assets/fuel-filter-product.png",
        partNumber: "TQ-FL-4999",
        publications: {
          create: {
            id: publicationId,
            nameEn: "Range filter fixture",
            nameZhCn: "范围筛选测试数据",
            slugEn: "range-filter-fixture",
            slugZhCn: "范围筛选测试数据",
            summaryEn: "Integration-only range filter fixture.",
            summaryZhCn: "仅用于集成测试的范围筛选数据。",
            version: 1,
          },
        },
      },
    });
    await prisma.product.update({
      data: { currentPublicationId: publicationId },
      where: { id: productId },
    });
    await prisma.productSpecificationValue.create({
      data: {
        attributeCode: "outer_diameter",
        attributeId: "specification-fuel-outer_diameter",
        baseUnit: "millimetre",
        dataType: "decimal",
        decimalValue: 110,
        nameEn: "Outer diameter",
        nameZhCn: "外径",
        position: 1,
        publicationId,
      },
    });

    try {
      const result = await searchPublishedProductsBySpecifications({
        categoryCode: "fuel",
        filters: [
          {
            attributeCode: "outer_diameter",
            kind: "decimal-range",
            maximum: 97,
            minimum: 95,
          },
        ],
        locale: "en",
        page: 1,
        prisma,
        unitSystem: "metric",
      });

      expect(result.products.map(({ partNumber }) => partNumber)).toEqual([
        "TQ-FL-4827",
      ]);
      expect(result).toMatchObject({ page: 1, pageSize: 12, total: 1 });
    } finally {
      await prisma.product.delete({ where: { id: productId } });
    }
  });

  it("英制结果仍按公制范围比较并把结果规格标为派生显示值", async () => {
    const result = await searchPublishedProductsBySpecifications({
      categoryCode: "fuel",
      filters: [
        {
          attributeCode: "outer_diameter",
          kind: "decimal-range",
          maximum: 97,
          minimum: 95,
        },
      ],
      locale: "en",
      page: 1,
      prisma,
      unitSystem: "imperial",
    });

    expect(result.products).toMatchObject([
      {
        keySpecifications: expect.arrayContaining([
          {
            code: "outer_diameter",
            converted: true,
            label: "Outer diameter",
            unit: "in",
            value: "3.78",
          },
        ]),
        partNumber: "TQ-FL-4827",
      },
    ]);
  });

  it("用当前分类的枚举选项筛选已发布产品", async () => {
    const productId = "product-tq-fl-4998-enum-filter-test";
    const publicationId = "publication-tq-fl-4998-enum-filter-test-v1";

    await prisma.product.create({
      data: {
        categoryId: "category-fuel",
        id: productId,
        imagePath: "/assets/fuel-filter-product.png",
        partNumber: "TQ-FL-4998",
        publications: {
          create: {
            id: publicationId,
            nameEn: "Enumeration filter fixture",
            nameZhCn: "枚举筛选测试数据",
            slugEn: "enumeration-filter-fixture",
            slugZhCn: "枚举筛选测试数据",
            summaryEn: "Integration-only enumeration filter fixture.",
            summaryZhCn: "仅用于集成测试的枚举筛选数据。",
            version: 1,
          },
        },
      },
    });
    await prisma.product.update({
      data: { currentPublicationId: publicationId },
      where: { id: productId },
    });
    await prisma.productSpecificationValue.create({
      data: {
        attributeCode: "construction_type",
        attributeId: "specification-fuel-construction_type",
        dataType: "enumeration",
        enumerationLabelEn: "Cartridge",
        enumerationLabelZhCn: "滤芯式",
        enumerationValue: "cartridge",
        nameEn: "Construction type",
        nameZhCn: "结构形式",
        position: 1,
        publicationId,
      },
    });

    try {
      const result = await searchPublishedProductsBySpecifications({
        categoryCode: "fuel",
        filters: [
          {
            attributeCode: "construction_type",
            kind: "enumeration",
            value: "cartridge",
          },
        ],
        locale: "en",
        page: 1,
        prisma,
        unitSystem: "metric",
      });

      expect(result.products.map(({ partNumber }) => partNumber)).toEqual([
        "TQ-FL-4998",
      ]);
    } finally {
      await prisma.product.delete({ where: { id: productId } });
    }
  });

  it("用当前分类的布尔规格筛选已发布产品", async () => {
    const result = await searchPublishedProductsBySpecifications({
      categoryCode: "fuel",
      filters: [
        {
          attributeCode: "water_separation",
          kind: "boolean",
          value: false,
        },
      ],
      locale: "en",
      page: 1,
      prisma,
      unitSystem: "metric",
    });

    expect(result.products).toEqual([]);
  });

  it("按产品编号稳定排序并把第十三项放到第二页", async () => {
    const fixtures = Array.from({ length: 12 }, (_, index) => {
      const suffix = String(4900 + index);
      return {
        partNumber: `TQ-FL-${suffix}`,
        productId: `product-tq-fl-${suffix}-pagination-test`,
        publicationId: `publication-tq-fl-${suffix}-pagination-test-v1`,
      };
    });

    await prisma.$transaction(async (transaction) => {
      for (const fixture of fixtures) {
        await transaction.product.create({
          data: {
            categoryId: "category-fuel",
            id: fixture.productId,
            imagePath: "/assets/fuel-filter-product.png",
            partNumber: fixture.partNumber,
            publications: {
              create: {
                id: fixture.publicationId,
                nameEn: `Pagination fixture ${fixture.partNumber}`,
                nameZhCn: `分页测试数据 ${fixture.partNumber}`,
                slugEn: `pagination-fixture-${fixture.partNumber.toLowerCase()}`,
                slugZhCn: `分页测试数据-${fixture.partNumber}`,
                summaryEn: "Integration-only pagination fixture.",
                summaryZhCn: "仅用于集成测试的分页数据。",
                version: 1,
              },
            },
          },
        });
        await transaction.product.update({
          data: { currentPublicationId: fixture.publicationId },
          where: { id: fixture.productId },
        });
      }
    });

    try {
      const firstPage = await searchPublishedProductsBySpecifications({
        categoryCode: "fuel",
        filters: [],
        locale: "en",
        page: 1,
        prisma,
        unitSystem: "metric",
      });
      const secondPage = await searchPublishedProductsBySpecifications({
        categoryCode: "fuel",
        filters: [],
        locale: "en",
        page: 2,
        prisma,
        unitSystem: "metric",
      });

      expect(firstPage.products).toHaveLength(12);
      expect(firstPage.products.map(({ partNumber }) => partNumber)).toEqual([
        "TQ-FL-4827",
        ...fixtures.slice(0, 11).map(({ partNumber }) => partNumber),
      ]);
      expect(secondPage.products.map(({ partNumber }) => partNumber)).toEqual([
        fixtures.at(-1)?.partNumber,
      ]);
      expect(firstPage).toMatchObject({ pageCount: 2, total: 13 });
    } finally {
      await prisma.product.deleteMany({
        where: { id: { in: fixtures.map(({ productId }) => productId) } },
      });
    }
  });
});

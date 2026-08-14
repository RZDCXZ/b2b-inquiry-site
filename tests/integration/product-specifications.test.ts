import { afterAll, describe, expect, it } from "vitest";

import { getPublishedProduct } from "@/src/application/public-catalog";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { validateProductSpecificationsForCategory } from "@/src/modules/catalog/server/product-specification-service";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);

describe("强类型产品规格持久化", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("数据库持久化四类属性定义的类型、基准单位、选项和行为标记", async () => {
    const categories = await prisma.productCategory.findMany({
      orderBy: { position: "asc" },
      select: {
        code: true,
        specificationAttributes: {
          orderBy: { position: "asc" },
          select: {
            baseUnit: true,
            code: true,
            dataType: true,
            filterable: true,
            options: {
              orderBy: { position: "asc" },
              select: { code: true },
            },
            required: true,
          },
        },
      },
    });

    expect(
      Object.fromEntries(
        categories.map(({ code, specificationAttributes }) => [
          code,
          specificationAttributes.map(
            ({ code: attributeCode }) => attributeCode,
          ),
        ]),
      ),
    ).toEqual({
      air: [
        "outer_diameter",
        "inner_diameter",
        "height",
        "media_type",
        "rated_air_flow",
      ],
      cabin: ["length", "width", "height", "media_type", "rated_air_flow"],
      fuel: [
        "construction_type",
        "outer_diameter",
        "height",
        "connection_specification",
        "filtration_rating",
        "rated_flow",
        "water_separation",
      ],
      oil: [
        "construction_type",
        "outer_diameter",
        "inner_diameter",
        "height",
        "thread_specification",
        "bypass_valve_opening_pressure",
        "anti_drainback_valve",
      ],
    });
    expect(
      categories
        .find(({ code }) => code === "air")
        ?.specificationAttributes.find(({ code }) => code === "media_type"),
    ).toMatchObject({
      baseUnit: null,
      dataType: "enumeration",
      filterable: true,
      options: expect.arrayContaining([{ code: "synthetic" }]),
      required: true,
    });
  });

  it("产品详情从所属分类定义读取按顺序排列的公制基准规格", async () => {
    const product = await getPublishedProduct({
      locale: "en",
      partNumber: "TQ-FL-4827",
      prisma,
    });

    expect(product?.specifications).toEqual([
      {
        code: "construction_type",
        converted: false,
        label: "Construction type",
        unit: null,
        value: "Spin-on",
      },
      {
        code: "outer_diameter",
        converted: false,
        label: "Outer diameter",
        unit: "mm",
        value: "96",
      },
      {
        code: "height",
        converted: false,
        label: "Height",
        unit: "mm",
        value: "178",
      },
      {
        code: "connection_specification",
        converted: false,
        label: "Connection specification",
        unit: null,
        value: "M16 × 1.5",
      },
      {
        code: "filtration_rating",
        converted: false,
        label: "Filtration rating",
        unit: "μm",
        value: "10",
      },
      {
        code: "rated_flow",
        converted: false,
        label: "Rated flow",
        unit: "L/min",
        value: "5.2",
      },
      {
        code: "water_separation",
        converted: false,
        label: "Water separation",
        unit: null,
        value: "Yes",
      },
    ]);
  });

  it("未设为当前版本的规格快照不会绕过发布改变公开详情", async () => {
    const publicationId = "publication-product-tq-fl-4827-v99-spec-test";
    const currentValues = await prisma.productSpecificationValue.findMany({
      where: { publicationId: "publication-product-tq-fl-4827-v1" },
    });

    await prisma.productPublication.create({
      data: {
        categoryId: "category-fuel",
        id: publicationId,
        imagePath: "/assets/fuel-filter-product.png",
        nameEn: "Specification snapshot test",
        nameZhCn: "规格快照测试",
        productId: "product-tq-fl-4827",
        slugEn: "specification-snapshot-test",
        slugZhCn: "规格快照测试",
        summaryEn: "Integration-only specification snapshot.",
        summaryZhCn: "仅用于集成测试的规格快照。",
        version: 99,
      },
    });
    await prisma.productSpecificationValue.createMany({
      data: currentValues.map(({ attributeId, ...value }) => ({
        ...value,
        attributeId,
        decimalValue:
          attributeId === "specification-fuel-outer_diameter"
            ? 100
            : value.decimalValue,
        publicationId,
      })),
    });

    try {
      const product = await getPublishedProduct({
        locale: "en",
        partNumber: "TQ-FL-4827",
        prisma,
      });

      expect(
        product?.specifications.find(({ code }) => code === "outer_diameter"),
      ).toMatchObject({ unit: "mm", value: "96" });
    } finally {
      await prisma.productPublication.delete({ where: { id: publicationId } });
    }
  });

  it("修改属性定义不会追溯改变已发布规格快照", async () => {
    await prisma.specificationAttributeDefinition.update({
      data: { baseUnit: "micrometre", nameEn: "Changed live definition" },
      where: { id: "specification-fuel-outer_diameter" },
    });
    await prisma.specificationAttributeOption.update({
      data: { labelEn: "Changed live option" },
      where: {
        attributeId_code: {
          attributeId: "specification-fuel-construction_type",
          code: "spin_on",
        },
      },
    });

    try {
      const product = await getPublishedProduct({
        locale: "en",
        partNumber: "TQ-FL-4827",
        prisma,
      });

      expect(product?.specifications.slice(0, 2)).toMatchObject([
        { label: "Construction type", value: "Spin-on" },
        { label: "Outer diameter", unit: "mm", value: "96" },
      ]);
    } finally {
      await prisma.specificationAttributeDefinition.update({
        data: { baseUnit: "millimetre", nameEn: "Outer diameter" },
        where: { id: "specification-fuel-outer_diameter" },
      });
      await prisma.specificationAttributeOption.update({
        data: { labelEn: "Spin-on" },
        where: {
          attributeId_code: {
            attributeId: "specification-fuel-construction_type",
            code: "spin_on",
          },
        },
      });
    }
  });

  it("服务端拒绝错误单位并保留已持久化的公制基准值", async () => {
    await expect(
      validateProductSpecificationsForCategory(prisma, {
        categoryId: "category-fuel",
        values: [
          { attributeCode: "construction_type", value: "spin_on" },
          { attributeCode: "outer_diameter", unit: "inch", value: 3.78 },
          { attributeCode: "height", unit: "millimetre", value: 178 },
          {
            attributeCode: "connection_specification",
            value: "M16 × 1.5",
          },
          {
            attributeCode: "filtration_rating",
            unit: "micrometre",
            value: 10,
          },
          {
            attributeCode: "rated_flow",
            unit: "litre_per_minute",
            value: 5.2,
          },
          { attributeCode: "water_separation", value: true },
        ],
      }),
    ).rejects.toMatchObject({ code: "unit_mismatch" });

    const product = await getPublishedProduct({
      locale: "en",
      partNumber: "TQ-FL-4827",
      prisma,
    });

    expect(
      product?.specifications.find(({ code }) => code === "outer_diameter"),
    ).toMatchObject({ unit: "mm", value: "96" });
  });
});

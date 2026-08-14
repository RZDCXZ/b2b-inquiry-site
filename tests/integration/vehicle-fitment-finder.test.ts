import { afterAll, describe, expect, it } from "vitest";

import {
  findPublishedProductsByVehicle,
  listPublishedVehicleFitmentOptions,
} from "@/src/application/public-catalog";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);

const northlineHx9 = {
  engineId: "engine-n13-420",
  makeId: "make-northline",
  modelId: "model-northline-hx9",
} as const;

describe("商用车型适配查找", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each([2019, 2024])("适用年份边界 %i 仍返回匹配产品", async (year) => {
    const products = await findPublishedProductsByVehicle({
      locale: "en",
      prisma,
      selection: { ...northlineHx9, categoryCode: "fuel", year },
    });

    expect(products.map(({ partNumber }) => partNumber)).toEqual([
      "TQ-FL-4827",
    ]);
  });

  it.each([2018, 2025])("适用年份范围外的 %i 不返回产品", async (year) => {
    const products = await findPublishedProductsByVehicle({
      locale: "en",
      prisma,
      selection: { ...northlineHx9, categoryCode: "fuel", year },
    });

    expect(products).toEqual([]);
  });

  it("发动机不属于所选车型时不返回产品", async () => {
    const products = await findPublishedProductsByVehicle({
      locale: "en",
      prisma,
      selection: {
        ...northlineHx9,
        categoryCode: "fuel",
        engineId: "engine-a11-390",
        year: 2022,
      },
    });

    expect(products).toEqual([]);
  });

  it("完整车辆条件仍有多个候选时按产品编号稳定返回全部匹配", async () => {
    const productId = "product-tq-fl-4800-multiple-candidate-test";
    const publicationId = "publication-tq-fl-4800-multiple-candidate-test-v1";

    await prisma.product.create({
      data: {
        categoryId: "category-fuel",
        currentPublicationId: null,
        id: productId,
        imagePath: "/assets/fuel-filter-product.png",
        partNumber: "TQ-FL-4800",
        publications: {
          create: {
            categoryId: "category-fuel",
            id: publicationId,
            imagePath: "/assets/fuel-filter-product.png",
            nameEn: "Multiple fitment candidate fixture",
            nameZhCn: "多候选适配测试数据",
            slugEn: "multiple-fitment-candidate-fixture",
            slugZhCn: "多候选适配测试数据",
            summaryEn: "Integration-only multiple-candidate fixture.",
            summaryZhCn: "仅用于集成测试的多候选数据。",
            version: 1,
          },
        },
      },
    });
    await prisma.product.update({
      data: { currentPublicationId: publicationId, status: "published" },
      where: { id: productId },
    });
    await prisma.productFitment.create({
      data: {
        engineId: northlineHx9.engineId,
        id: "fitment-tq-fl-4800-multiple-candidate-test",
        publicationId,
        vehicleModelId: northlineHx9.modelId,
        yearFrom: 2020,
        yearTo: 2023,
      },
    });

    try {
      const products = await findPublishedProductsByVehicle({
        locale: "en",
        prisma,
        selection: {
          ...northlineHx9,
          categoryCode: "fuel",
          year: 2022,
        },
      });

      expect(products.map(({ partNumber }) => partNumber)).toEqual([
        "TQ-FL-4800",
        "TQ-FL-4827",
      ]);
    } finally {
      await prisma.product.delete({ where: { id: productId } });
    }
  });

  it("完整车辆条件和分类只返回当前已发布的唯一标准替换件", async () => {
    const products = await findPublishedProductsByVehicle({
      locale: "zh-cn",
      prisma,
      selection: { ...northlineHx9, categoryCode: "fuel", year: 2022 },
    });

    expect(products).toMatchObject([
      {
        href: "/zh-cn/products/TQ-FL-4827/%E9%AB%98%E6%95%88%E7%87%83%E6%B2%B9%E6%BB%A4%E6%B8%85%E5%99%A8",
        name: "高效燃油滤清器",
        partNumber: "TQ-FL-4827",
      },
    ]);
    expect(products).not.toContainEqual(
      expect.objectContaining({ partNumber: "TQ-DF-9000" }),
    );
  });

  it("不把非当前发布快照的适配关系暴露为级联选项或查询结果", async () => {
    const productId = "product-unpublished-fitment-test";
    const publicationId = "publication-unpublished-fitment-test-v1";
    const optionCount = (
      await listPublishedVehicleFitmentOptions({ locale: "en", prisma })
    ).length;

    await prisma.product.create({
      data: {
        categoryId: "category-fuel",
        id: productId,
        imagePath: "/assets/fuel-filter-product.png",
        partNumber: "TQ-UF-9999",
        publications: {
          create: {
            categoryId: "category-fuel",
            id: publicationId,
            imagePath: "/assets/fuel-filter-product.png",
            nameEn: "Unpublished fitment fixture",
            nameZhCn: "未发布适配测试数据",
            slugEn: "unpublished-fitment-fixture",
            slugZhCn: "未发布适配测试数据",
            summaryEn: "Integration-only unpublished fitment fixture.",
            summaryZhCn: "仅用于集成测试的未发布适配数据。",
            version: 1,
          },
        },
      },
    });
    await prisma.productFitment.create({
      data: {
        engineId: northlineHx9.engineId,
        id: "fitment-unpublished-fitment-test",
        publicationId,
        vehicleModelId: northlineHx9.modelId,
        yearFrom: 2019,
        yearTo: 2024,
      },
    });

    try {
      expect(
        await listPublishedVehicleFitmentOptions({ locale: "en", prisma }),
      ).toHaveLength(optionCount);
      expect(
        (
          await findPublishedProductsByVehicle({
            locale: "en",
            prisma,
            selection: {
              ...northlineHx9,
              categoryCode: "fuel",
              year: 2022,
            },
          })
        ).map(({ partNumber }) => partNumber),
      ).toEqual(["TQ-FL-4827"]);
    } finally {
      await prisma.product.delete({ where: { id: productId } });
    }
  });
});

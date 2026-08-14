import { afterAll, describe, expect, it } from "vitest";

import { lookupPublishedProductNumber } from "@/src/application/public-catalog";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);

describe("产品编号与参考号查找", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("唯一产品编号返回可直接进入当前语言详情的标准替换件", async () => {
    const result = await lookupPublishedProductNumber({
      locale: "en",
      number: "TQ-FL-4827",
      prisma,
    });

    expect(result).toMatchObject({
      kind: "product-number",
      product: {
        href: "/en/products/TQ-FL-4827/high-efficiency-fuel-filter",
        name: "High-Efficiency Fuel Filter",
        partNumber: "TQ-FL-4827",
      },
    });
  });

  it("唯一参考号返回带虚构品牌标识的结果而不是伪装成产品编号", async () => {
    const result = await lookupPublishedProductNumber({
      locale: "en",
      number: "NFX-9081",
      prisma,
    });

    expect(result).toMatchObject({
      kind: "reference-number",
      matches: [
        {
          product: { partNumber: "TQ-FL-4827" },
          references: [{ brand: "Novera", referenceNumber: "NFX-9081" }],
        },
      ],
      number: "NFX-9081",
    });
  });

  it("歧义参考号按产品编号稳定返回全部匹配项", async () => {
    const result = await lookupPublishedProductNumber({
      locale: "zh-cn",
      number: "ARV-4400",
      prisma,
    });

    expect(result).toMatchObject({
      kind: "reference-number",
      matches: [
        {
          product: { name: "高容空气滤清器", partNumber: "TQ-AF-2106" },
          references: [{ brand: "Arvento", referenceNumber: "ARV-4400" }],
        },
        {
          product: {
            name: "活性炭空调滤清器",
            partNumber: "TQ-CF-3021",
          },
          references: [{ brand: "Arvento", referenceNumber: "ARV-4400" }],
        },
      ],
    });
  });

  it("参考号格式差异忽略大小写、空格和连字符", async () => {
    const result = await lookupPublishedProductNumber({
      locale: "en",
      number: " nfx 90-81 ",
      prisma,
    });

    expect(result).toMatchObject({
      kind: "reference-number",
      matches: [{ product: { partNumber: "TQ-FL-4827" } }],
    });
  });

  it("产品编号与参考号冲突时仍优先直达产品编号对应产品", async () => {
    const result = await lookupPublishedProductNumber({
      locale: "en",
      number: "tq af 2106",
      prisma,
    });

    expect(result).toMatchObject({
      kind: "product-number",
      product: { partNumber: "TQ-AF-2106" },
    });
  });

  it("相似但不相同的号码不做模糊匹配", async () => {
    const result = await lookupPublishedProductNumber({
      locale: "en",
      number: "NFX-9082",
      prisma,
    });

    expect(result).toEqual({ kind: "not-found", number: "NFX-9082" });
  });

  it("只从当前不可变发布快照查找参考号", async () => {
    const publicationId = "publication-product-tq-fl-4827-v2-reference-test";
    await prisma.productPublication.create({
      data: {
        categoryId: "category-fuel",
        id: publicationId,
        imagePath: "/assets/fuel-filter-product.png",
        nameEn: "Reference snapshot fixture",
        nameZhCn: "参考号快照测试数据",
        productId: "product-tq-fl-4827",
        references: {
          create: {
            brand: "Novera",
            id: "reference-product-tq-fl-4827-v2-test",
            referenceNumber: "NFX-9200",
          },
        },
        slugEn: "reference-snapshot-fixture",
        slugZhCn: "参考号快照测试数据",
        summaryEn: "Integration-only immutable publication fixture.",
        summaryZhCn: "仅用于集成测试的不可变发布数据。",
        version: 2,
      },
    });

    try {
      expect(
        await lookupPublishedProductNumber({
          locale: "en",
          number: "NFX-9200",
          prisma,
        }),
      ).toEqual({ kind: "not-found", number: "NFX-9200" });

      await prisma.product.update({
        data: { currentPublicationId: publicationId },
        where: { id: "product-tq-fl-4827" },
      });

      expect(
        await lookupPublishedProductNumber({
          locale: "en",
          number: "NFX-9200",
          prisma,
        }),
      ).toMatchObject({
        kind: "reference-number",
        matches: [{ product: { partNumber: "TQ-FL-4827" } }],
      });
      expect(
        await lookupPublishedProductNumber({
          locale: "en",
          number: "NFX-9081",
          prisma,
        }),
      ).toEqual({ kind: "not-found", number: "NFX-9081" });
    } finally {
      await prisma.product.update({
        data: {
          currentPublicationId: "publication-product-tq-fl-4827-v1",
        },
        where: { id: "product-tq-fl-4827" },
      });
      await prisma.productPublication.delete({ where: { id: publicationId } });
    }
  });
});

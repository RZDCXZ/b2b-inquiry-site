import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";

const publicProductPublications = [
  {
    categoryId: "category-air",
    id: "publication-product-tq-af-2000-v1",
    imagePath: "/assets/filter-family.png",
    nameEn: "Legacy Air Filter",
    nameZhCn: "历史空气滤清器",
    productId: "product-tq-af-2000",
    slugEn: "legacy-air-filter",
    slugZhCn: "历史空气滤清器",
    summaryEn:
      "Discontinued standard replacement air filter retained for historical identification.",
    summaryZhCn: "为历史识别保留的已停产标准替换空气滤清器。",
    status: "discontinued",
    version: 1,
  },
  {
    categoryId: "category-air",
    id: "publication-product-tq-af-2106-v1",
    imagePath: "/assets/filter-family.png",
    nameEn: "High-Capacity Air Filter",
    nameZhCn: "高容空气滤清器",
    productId: "product-tq-af-2106",
    slugEn: "high-capacity-air-filter",
    slugZhCn: "高容空气滤清器",
    summaryEn:
      "Standard replacement air filter for selected commercial vehicle applications.",
    summaryZhCn: "适用于指定商用车型的标准替换空气滤清器。",
    status: "published",
    version: 1,
  },
  {
    categoryId: "category-cabin",
    id: "publication-product-tq-cf-3021-v1",
    imagePath: "/assets/filter-family.png",
    nameEn: "Activated Carbon Cabin Filter",
    nameZhCn: "活性炭空调滤清器",
    productId: "product-tq-cf-3021",
    slugEn: "activated-carbon-cabin-filter",
    slugZhCn: "活性炭空调滤清器",
    summaryEn:
      "Standard replacement cabin filter with a demonstration carbon layer.",
    summaryZhCn: "带演示活性炭层的标准替换空调滤清器。",
    status: "published",
    version: 1,
  },
  {
    categoryId: "category-fuel",
    id: "publication-product-tq-fl-4720-v1",
    imagePath: "/assets/fuel-filter-product.png",
    nameEn: "Legacy Fuel Filter",
    nameZhCn: "历史燃油滤清器",
    productId: "product-tq-fl-4720",
    replacementProductId: "product-tq-fl-4827",
    slugEn: "legacy-fuel-filter",
    slugZhCn: "历史燃油滤清器",
    summaryEn:
      "Discontinued standard replacement fuel filter retained with its historical specifications.",
    summaryZhCn: "保留历史规格的已停产标准替换燃油滤清器。",
    status: "discontinued",
    version: 1,
  },
  {
    categoryId: "category-fuel",
    id: "publication-product-tq-fl-4827-v1",
    imagePath: "/assets/fuel-filter-product.png",
    nameEn: "High-Efficiency Fuel Filter",
    nameZhCn: "高效燃油滤清器",
    productId: "product-tq-fl-4827",
    slugEn: "high-efficiency-fuel-filter",
    slugZhCn: "高效燃油滤清器",
    summaryEn:
      "Standard replacement fuel filter for selected commercial vehicle applications.",
    summaryZhCn: "适用于指定商用车型的标准替换燃油滤清器。",
    status: "published",
    version: 1,
  },
  {
    categoryId: "category-oil",
    id: "publication-product-tq-of-1038-v1",
    imagePath: "/assets/filter-family.png",
    nameEn: "Spin-On Oil Filter",
    nameZhCn: "旋装式机油滤清器",
    productId: "product-tq-of-1038",
    slugEn: "spin-on-oil-filter",
    slugZhCn: "旋装式机油滤清器",
    summaryEn:
      "Standard replacement spin-on oil filter for selected diesel engines.",
    summaryZhCn: "适用于指定柴油发动机的标准替换旋装式机油滤清器。",
    status: "published",
    version: 1,
  },
] as const;

async function writePublishedProductContent(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  for (const product of publicProductPublications) {
    await transaction.productPublication.createMany({
      data: {
        ...product,
        descriptionEn: product.summaryEn,
        descriptionZhCn: product.summaryZhCn,
        fitmentSummaryEn: "Selected commercial vehicle applications.",
        fitmentSummaryZhCn: "适用于指定商用车型。",
        imageAltEn: `${product.nameEn} product image`,
        imageAltZhCn: `${product.nameZhCn}产品图片`,
        seoDescriptionEn: product.summaryEn,
        seoDescriptionZhCn: product.summaryZhCn,
        seoTitleEn: `${product.nameEn} | Torquelis Filters`,
        seoTitleZhCn: `${product.nameZhCn}｜拓擎利滤清`,
        sourceDraftVersion: 1,
      },
      skipDuplicates: true,
    });
  }
}

export async function seedPublishedProductContent(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction((transaction) =>
    writePublishedProductContent(transaction),
  );
}

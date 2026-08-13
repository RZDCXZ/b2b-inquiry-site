import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";

const categories = [
  {
    code: "air",
    id: "category-air",
    nameEn: "Air filters",
    nameZhCn: "空气滤清器",
    position: 1,
  },
  {
    code: "oil",
    id: "category-oil",
    nameEn: "Oil filters",
    nameZhCn: "机油滤清器",
    position: 2,
  },
  {
    code: "fuel",
    id: "category-fuel",
    nameEn: "Fuel filters",
    nameZhCn: "燃油滤清器",
    position: 3,
  },
  {
    code: "cabin",
    id: "category-cabin",
    nameEn: "Cabin filters",
    nameZhCn: "空调滤清器",
    position: 4,
  },
] as const;

const products = [
  {
    categoryId: "category-air",
    id: "product-tq-af-2106",
    imagePath: "/assets/filter-family.png",
    partNumber: "TQ-AF-2106",
  },
  {
    categoryId: "category-cabin",
    id: "product-tq-cf-3021",
    imagePath: "/assets/filter-family.png",
    partNumber: "TQ-CF-3021",
  },
  {
    categoryId: "category-fuel",
    id: "product-tq-fl-4827",
    imagePath: "/assets/fuel-filter-product.png",
    partNumber: "TQ-FL-4827",
  },
  {
    categoryId: "category-oil",
    id: "product-tq-of-1038",
    imagePath: "/assets/filter-family.png",
    partNumber: "TQ-OF-1038",
  },
  {
    categoryId: "category-fuel",
    id: "product-tq-df-9000",
    imagePath: "/assets/fuel-filter-product.png",
    partNumber: "TQ-DF-9000",
  },
] as const;

async function writeCatalogIdentities(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  for (const category of categories) {
    await transaction.productCategory.upsert({
      create: category,
      update: category,
      where: { id: category.id },
    });
  }

  for (const product of products) {
    await transaction.product.upsert({
      create: product,
      update: product,
      where: { id: product.id },
    });
  }
}

export async function seedCatalogIdentities(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction((transaction) =>
    writeCatalogIdentities(transaction),
  );
}

export async function replaceCatalogIdentities(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.product.deleteMany();
    await transaction.productCategory.deleteMany();
    await writeCatalogIdentities(transaction);
  });
}

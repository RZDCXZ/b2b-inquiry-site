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
    id: "product-tq-af-2000",
    imagePath: "/assets/filter-family.png",
    partNumber: "TQ-AF-2000",
  },
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
    id: "product-tq-fl-4720",
    imagePath: "/assets/fuel-filter-product.png",
    partNumber: "TQ-FL-4720",
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

const publicProductLifecycles = [
  {
    currentPublicationId: "publication-product-tq-af-2000-v1",
    id: "product-tq-af-2000",
    status: "discontinued",
  },
  {
    currentPublicationId: "publication-product-tq-af-2106-v1",
    id: "product-tq-af-2106",
    status: "published",
  },
  {
    currentPublicationId: "publication-product-tq-cf-3021-v1",
    id: "product-tq-cf-3021",
    status: "published",
  },
  {
    currentPublicationId: "publication-product-tq-fl-4720-v1",
    id: "product-tq-fl-4720",
    status: "discontinued",
  },
  {
    currentPublicationId: "publication-product-tq-fl-4827-v1",
    id: "product-tq-fl-4827",
    status: "published",
  },
  {
    currentPublicationId: "publication-product-tq-of-1038-v1",
    id: "product-tq-of-1038",
    status: "published",
  },
] as const;

const productReferences = [
  {
    brand: "Novera",
    id: "reference-product-tq-af-2106-novera",
    publicationId: "publication-product-tq-af-2106-v1",
    referenceNumber: "NAF-2106",
  },
  {
    brand: "Arvento",
    id: "reference-product-tq-af-2106-arvento",
    publicationId: "publication-product-tq-af-2106-v1",
    referenceNumber: "ARV-4400",
  },
  {
    brand: "Valecore",
    id: "reference-product-tq-cf-3021-valecore",
    publicationId: "publication-product-tq-cf-3021-v1",
    referenceNumber: "VCF-3021",
  },
  {
    brand: "Arvento",
    id: "reference-product-tq-cf-3021-arvento",
    publicationId: "publication-product-tq-cf-3021-v1",
    referenceNumber: "ARV-4400",
  },
  {
    brand: "Novera",
    id: "reference-product-tq-fl-4827-novera",
    publicationId: "publication-product-tq-fl-4827-v1",
    referenceNumber: "NFX-9081",
  },
  {
    brand: "Arvento",
    id: "reference-product-tq-fl-4827-arvento",
    publicationId: "publication-product-tq-fl-4827-v1",
    referenceNumber: "ARV-7710",
  },
  {
    brand: "Valecore",
    id: "reference-product-tq-fl-4827-product-number-collision",
    publicationId: "publication-product-tq-fl-4827-v1",
    referenceNumber: "TQ-AF-2106",
  },
  {
    brand: "Novera",
    id: "reference-product-tq-of-1038-novera",
    publicationId: "publication-product-tq-of-1038-v1",
    referenceNumber: "NOF-1038",
  },
  {
    brand: "Branton",
    id: "reference-product-tq-of-1038-branton",
    publicationId: "publication-product-tq-of-1038-v1",
    referenceNumber: "BRN-1038",
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

export async function seedCatalogProductLifecycleDemoData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    for (const lifecycle of publicProductLifecycles) {
      await transaction.product.update({
        data: {
          currentPublicationId: lifecycle.currentPublicationId,
          replacementProductId: null,
          status: lifecycle.status,
        },
        where: { id: lifecycle.id },
      });
    }

    await transaction.product.update({
      data: { replacementProductId: "product-tq-fl-4827" },
      where: { id: "product-tq-fl-4720" },
    });
  });
}

export async function seedProductReferenceDemoData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.productReference.createMany({
    data: [...productReferences],
    skipDuplicates: true,
  });
}

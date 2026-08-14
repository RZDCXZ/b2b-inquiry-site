import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  normalizeProductNumber,
  type ProductCategoryCode,
} from "@/src/modules/catalog/public/product-identity";
import type { SpecificationFilter } from "@/src/modules/catalog/public/specification-filters";
import type { ProductStatus } from "@/src/modules/catalog/public/product-lifecycle";

export type CatalogCategory = {
  code: ProductCategoryCode;
  nameEn: string;
  nameZhCn: string;
};

export type CatalogProductIdentity = {
  category: {
    code: ProductCategoryCode;
    nameEn: string;
    nameZhCn: string;
  };
  id: string;
  imagePath: string;
  partNumber: string;
  currentPublicationId: string | null;
  replacementProduct: CatalogReplacementProductIdentity | null;
  replacementProductId: string | null;
  status: ProductStatus;
};

export type CatalogReplacementProductIdentity = Omit<
  CatalogProductIdentity,
  "replacementProduct" | "replacementProductId"
>;

export type CatalogProductReferenceMatch = {
  brand: string;
  publicationId: string;
  referenceNumber: string;
};

export type CatalogProductReference = Omit<
  CatalogProductReferenceMatch,
  "publicationId"
>;

const catalogProductIdentitySelect = {
  category: {
    select: { code: true, nameEn: true, nameZhCn: true },
  },
  id: true,
  imagePath: true,
  partNumber: true,
  currentPublicationId: true,
  replacementProduct: {
    select: {
      category: {
        select: { code: true, nameEn: true, nameZhCn: true },
      },
      currentPublicationId: true,
      id: true,
      imagePath: true,
      partNumber: true,
      status: true,
    },
  },
  replacementProductId: true,
  status: true,
} as const;

const publishedCatalogProductWhere = {
  currentPublicationId: { not: null },
  status: "published",
} satisfies Prisma.ProductWhereInput;

export async function listPublishedCatalogProductIdentities(
  prisma: PrismaClient,
  categoryCode?: ProductCategoryCode,
): Promise<CatalogProductIdentity[]> {
  const products = await prisma.product.findMany({
    orderBy: { partNumber: "asc" },
    select: catalogProductIdentitySelect,
    where: {
      ...publishedCatalogProductWhere,
      category: categoryCode ? { code: categoryCode } : undefined,
    },
  });

  return products as CatalogProductIdentity[];
}

export async function findCatalogProductIdentitiesBySpecifications(
  prisma: PrismaClient,
  {
    categoryCode,
    filters,
    page,
    pageSize,
  }: {
    categoryCode: ProductCategoryCode;
    filters: SpecificationFilter[];
    page: number;
    pageSize: number;
  },
): Promise<{ identities: CatalogProductIdentity[]; total: number }> {
  const where = {
    AND: filters.map((filter) => {
      let specificationValue: Prisma.ProductSpecificationValueWhereInput;

      switch (filter.kind) {
        case "decimal-range":
          specificationValue = {
            attributeCode: filter.attributeCode,
            decimalValue: {
              gte: filter.minimum,
              lte: filter.maximum,
            },
          };
          break;
        case "enumeration":
          specificationValue = {
            attributeCode: filter.attributeCode,
            enumerationValue: filter.value,
          };
          break;
        case "boolean":
          specificationValue = {
            attributeCode: filter.attributeCode,
            booleanValue: filter.value,
          };
          break;
      }

      return {
        currentPublication: {
          is: { specificationValues: { some: specificationValue } },
        },
      };
    }),
    category: { code: categoryCode },
    ...publishedCatalogProductWhere,
  } satisfies Prisma.ProductWhereInput;
  const [identities, total] = await prisma.$transaction([
    prisma.product.findMany({
      orderBy: { partNumber: "asc" },
      select: catalogProductIdentitySelect,
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    }),
    prisma.product.count({ where }),
  ]);

  return { identities: identities as CatalogProductIdentity[], total };
}

export async function listCatalogCategories(
  prisma: PrismaClient,
): Promise<CatalogCategory[]> {
  const categories = await prisma.productCategory.findMany({
    orderBy: { position: "asc" },
    select: { code: true, nameEn: true, nameZhCn: true },
  });

  return categories as CatalogCategory[];
}

export async function findCatalogProductIdentity(
  prisma: PrismaClient,
  partNumber: string,
): Promise<CatalogProductIdentity | null> {
  const product = await prisma.product.findUnique({
    select: catalogProductIdentitySelect,
    where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
  });

  return product as CatalogProductIdentity | null;
}

export async function findCatalogProductIdentityById(
  prisma: PrismaClient,
  productId: string,
): Promise<CatalogProductIdentity | null> {
  const product = await prisma.product.findUnique({
    select: catalogProductIdentitySelect,
    where: { id: productId },
  });

  return product as CatalogProductIdentity | null;
}

export async function findCatalogProductReferences(
  prisma: PrismaClient,
  number: string,
  currentPublicationIds: string[],
): Promise<CatalogProductReferenceMatch[]> {
  if (currentPublicationIds.length === 0) {
    return [];
  }

  const references = await prisma.productReference.findMany({
    orderBy: [
      { publicationId: "asc" },
      { brand: "asc" },
      { referenceNumber: "asc" },
    ],
    select: {
      brand: true,
      publicationId: true,
      referenceNumber: true,
    },
    where: {
      normalizedReferenceNumber: normalizeProductNumber(number),
      publicationId: { in: currentPublicationIds },
    },
  });

  return references;
}

export async function listCatalogProductReferences(
  prisma: PrismaClient,
  publicationId: string,
): Promise<CatalogProductReference[]> {
  return prisma.productReference.findMany({
    orderBy: [{ brand: "asc" }, { referenceNumber: "asc" }],
    select: { brand: true, referenceNumber: true },
    where: { publicationId },
  });
}

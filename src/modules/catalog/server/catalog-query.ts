import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  normalizeProductNumber,
  type ProductCategoryCode,
} from "@/src/modules/catalog/public/product-identity";
import type { SpecificationFilter } from "@/src/modules/catalog/public/specification-filters";

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
};

export type CatalogProductReferenceMatch = {
  brand: string;
  publicationId: string;
  referenceNumber: string;
};

const catalogProductIdentitySelect = {
  category: {
    select: { code: true, nameEn: true, nameZhCn: true },
  },
  id: true,
  imagePath: true,
  partNumber: true,
  currentPublicationId: true,
} as const;

export async function listCatalogProductIdentities(
  prisma: PrismaClient,
  categoryCode?: ProductCategoryCode,
): Promise<CatalogProductIdentity[]> {
  const products = await prisma.product.findMany({
    orderBy: { partNumber: "asc" },
    select: catalogProductIdentitySelect,
    where: categoryCode ? { category: { code: categoryCode } } : undefined,
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
    currentPublicationId: { not: null },
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

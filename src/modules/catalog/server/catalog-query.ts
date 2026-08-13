import type { PrismaClient } from "@/src/generated/prisma/client";
import {
  normalizeProductNumber,
  type ProductCategoryCode,
} from "@/src/modules/catalog/public/product-identity";

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
  product: CatalogProductIdentity;
  publicationId: string;
  referenceNumber: string;
};

export async function listCatalogProductIdentities(
  prisma: PrismaClient,
  categoryCode?: ProductCategoryCode,
): Promise<CatalogProductIdentity[]> {
  const products = await prisma.product.findMany({
    orderBy: { partNumber: "asc" },
    select: {
      category: {
        select: { code: true, nameEn: true, nameZhCn: true },
      },
      id: true,
      imagePath: true,
      partNumber: true,
      currentPublicationId: true,
    },
    where: categoryCode ? { category: { code: categoryCode } } : undefined,
  });

  return products as CatalogProductIdentity[];
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
    select: {
      category: {
        select: { code: true, nameEn: true, nameZhCn: true },
      },
      id: true,
      imagePath: true,
      partNumber: true,
      currentPublicationId: true,
    },
    where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
  });

  return product as CatalogProductIdentity | null;
}

export async function findCatalogProductReferences(
  prisma: PrismaClient,
  number: string,
): Promise<CatalogProductReferenceMatch[]> {
  const references = await prisma.productReference.findMany({
    orderBy: [
      { publication: { product: { partNumber: "asc" } } },
      { brand: "asc" },
      { referenceNumber: "asc" },
    ],
    select: {
      brand: true,
      publication: {
        select: {
          id: true,
          product: {
            select: {
              category: {
                select: { code: true, nameEn: true, nameZhCn: true },
              },
              currentPublicationId: true,
              id: true,
              imagePath: true,
              partNumber: true,
            },
          },
        },
      },
      referenceNumber: true,
    },
    where: {
      normalizedReferenceNumber: normalizeProductNumber(number),
      publication: { currentFor: { isNot: null } },
    },
  });

  return references.map((reference) => ({
    brand: reference.brand,
    product: reference.publication.product as CatalogProductIdentity,
    publicationId: reference.publication.id,
    referenceNumber: reference.referenceNumber,
  }));
}

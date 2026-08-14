import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import { renderProductSpecificationPdf } from "@/src/infrastructure/documents/product-specification-pdf";
import {
  findCatalogProductIdentity,
  listCatalogProductReferences,
} from "@/src/modules/catalog/server/catalog-query";
import { listCatalogVehicleFitments } from "@/src/modules/catalog/server/fitment-query";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import { getPublishedProduct } from "@/src/application/public-catalog";

export type ProductSpecificationPdfDownload = {
  bytes: Uint8Array;
  filename: string;
};

function safeFilenameComponent(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/[^A-Za-z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function generatePublishedProductSpecificationPdf({
  locale,
  partNumber,
  prisma = getApplicationPrisma(),
  slug,
}: {
  locale: PublicLocale;
  partNumber: string;
  prisma?: ApplicationDatabase;
  slug: string;
}): Promise<ProductSpecificationPdfDownload | null> {
  const identity = await findCatalogProductIdentity(prisma, partNumber);

  if (
    !identity?.currentPublicationId ||
    identity.currentPublication?.status === "draft"
  ) {
    return null;
  }

  const product = await getPublishedProduct({
    knownIdentity: identity,
    locale,
    partNumber,
    prisma,
  });

  if (!product || product.slug !== slug) {
    return null;
  }

  const [references, fitments] = await Promise.all([
    listCatalogProductReferences(prisma, identity.currentPublicationId),
    listCatalogVehicleFitments(prisma, identity.currentPublicationId),
  ]);
  const bytes = await renderProductSpecificationPdf({
    categoryName: product.category.name,
    fitments: fitments.map((fitment) => ({
      engine: fitment.engine.code,
      make: fitment.make.name,
      model: fitment.model.name,
      yearFrom: fitment.yearFrom,
      yearTo: fitment.yearTo,
    })),
    locale,
    name: product.name,
    partNumber: product.partNumber,
    references,
    specifications: product.specifications,
  });

  return {
    bytes,
    filename: `${safeFilenameComponent(product.partNumber) || "product"}-specification-${locale}.pdf`,
  };
}

import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import {
  renderProductSpecificationPdf,
  watermarkUploadedProductSpecificationPdf,
} from "@/src/infrastructure/documents/product-specification-pdf";
import {
  DEFAULT_UPLOAD_DIRECTORY,
  readUploadedAsset,
} from "@/src/infrastructure/local-demo/uploaded-assets";
import { normalizeProductNumber } from "@/src/modules/catalog/public/product-identity";
import {
  findCatalogProductIdentity,
  listCatalogProductReferences,
} from "@/src/modules/catalog/server/catalog-query";
import { listCatalogVehicleFitments } from "@/src/modules/catalog/server/fitment-query";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { getPublishedProduct } from "@/src/application/public-catalog";
import { getProductDraftPreview } from "@/src/application/product-publishing";

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
  storageDirectory = DEFAULT_UPLOAD_DIRECTORY,
}: {
  locale: PublicLocale;
  partNumber: string;
  prisma?: ApplicationDatabase;
  slug: string;
  storageDirectory?: string;
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

  const customDocument = await prisma.productPublication.findUnique({
    select: {
      documentAsset: { select: { storageFilename: true } },
    },
    where: { id: identity.currentPublicationId },
  });
  if (customDocument?.documentAsset) {
    const uploadedBytes = await readUploadedAsset({
      storageDirectory,
      storageFilename: customDocument.documentAsset.storageFilename,
    });
    return {
      bytes: await watermarkUploadedProductSpecificationPdf({
        bytes: uploadedBytes,
        locale,
      }),
      filename: `${safeFilenameComponent(product.partNumber) || "product"}-specification-${locale}.pdf`,
    };
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

export async function generateProductDraftSpecificationPdf({
  actor,
  locale,
  partNumber,
  prisma = getApplicationPrisma(),
  storageDirectory = DEFAULT_UPLOAD_DIRECTORY,
}: {
  actor: AdminActor;
  locale: PublicLocale;
  partNumber: string;
  prisma?: ApplicationDatabase;
  storageDirectory?: string;
}): Promise<ProductSpecificationPdfDownload> {
  const preview = await getProductDraftPreview({
    actor,
    locale,
    partNumber,
    prisma,
  });
  const customDocument = await prisma.product.findUnique({
    select: {
      draft: {
        select: {
          documentAsset: { select: { storageFilename: true } },
        },
      },
    },
    where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
  });
  const filename = `${safeFilenameComponent(preview.partNumber) || "product"}-specification-${locale}.pdf`;

  if (customDocument?.draft?.documentAsset) {
    const uploadedBytes = await readUploadedAsset({
      storageDirectory,
      storageFilename: customDocument.draft.documentAsset.storageFilename,
    });
    return {
      bytes: await watermarkUploadedProductSpecificationPdf({
        bytes: uploadedBytes,
        locale,
      }),
      filename,
    };
  }

  return {
    bytes: await renderProductSpecificationPdf({
      categoryName: preview.category,
      fitments: preview.fitments,
      locale,
      name: preview.name,
      partNumber: preview.partNumber,
      references: preview.references,
      specifications: preview.specifications,
    }),
    filename,
  };
}

import type { PrismaClient } from "@/src/generated/prisma/client";
import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";
import {
  productDetailPath,
  type ProductCategoryCode,
} from "@/src/modules/catalog/public/product-identity";
import {
  findCatalogProductIdentity,
  findCatalogProductReferences,
  listCatalogCategories,
  listCatalogProductIdentities,
  type CatalogProductIdentity,
} from "@/src/modules/catalog/server/catalog-query";
import {
  listPublishedProductContent,
  type PublishedProductContent,
} from "@/src/modules/content-publishing/server/product-public-content-query";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import {
  formatProductSpecification,
  type ProductSpecificationDisplay,
  type UnitSystem,
} from "@/src/modules/catalog/public/specifications";
import { listProductSpecifications } from "@/src/modules/catalog/server/product-specification-query";

export type PublishedCatalogProduct = {
  category: { code: ProductCategoryCode; name: string };
  href: string;
  id: string;
  imagePath: string;
  name: string;
  partNumber: string;
  slug: string;
  summary: string;
};

export type LocalizedProductCategory = {
  code: ProductCategoryCode;
  name: string;
};

export type PublishedProductDetail = PublishedCatalogProduct & {
  languageHrefs: Record<PublicLocale, string>;
  specifications: ProductSpecificationDisplay[];
  unitSystem: UnitSystem;
};

export type ProductNumberLookupResult =
  | { kind: "product-number"; product: PublishedProductDetail }
  | {
      kind: "reference-number";
      matches: PublishedReferenceMatch[];
      number: string;
    }
  | { kind: "not-found"; number: string };

export type PublishedReferenceMatch = {
  product: PublishedCatalogProduct;
  references: Array<{ brand: string; referenceNumber: string }>;
};

function localizeProduct(
  locale: PublicLocale,
  identity: CatalogProductIdentity,
  content: PublishedProductContent,
) {
  return locale === "en"
    ? {
        categoryName: identity.category.nameEn,
        name: content.nameEn,
        slug: content.slugEn,
        summary: content.summaryEn,
      }
    : {
        categoryName: identity.category.nameZhCn,
        name: content.nameZhCn,
        slug: content.slugZhCn,
        summary: content.summaryZhCn,
      };
}

export async function listPublishedProducts({
  categoryCode,
  locale,
  prisma = getApplicationPrisma(),
}: {
  categoryCode?: ProductCategoryCode;
  locale: PublicLocale;
  prisma?: PrismaClient;
}): Promise<PublishedCatalogProduct[]> {
  const identities = await listCatalogProductIdentities(prisma, categoryCode);
  const contents = await listPublishedProductContent(
    prisma,
    identities.flatMap(({ currentPublicationId }) =>
      currentPublicationId ? [currentPublicationId] : [],
    ),
  );
  const contentByProductId = new Map(
    contents.map((content) => [content.productId, content]),
  );

  return identities.flatMap((identity) => {
    const content = contentByProductId.get(identity.id);

    if (!content) {
      return [];
    }

    const localized = localizeProduct(locale, identity, content);

    return [
      {
        category: {
          code: identity.category.code,
          name: localized.categoryName,
        },
        href: productDetailPath(locale, {
          partNumber: identity.partNumber,
          slug: localized.slug,
        }),
        id: identity.id,
        imagePath: identity.imagePath,
        name: localized.name,
        partNumber: identity.partNumber,
        slug: localized.slug,
        summary: localized.summary,
      },
    ];
  });
}

export async function listProductCategories({
  locale,
  prisma = getApplicationPrisma(),
}: {
  locale: PublicLocale;
  prisma?: PrismaClient;
}): Promise<LocalizedProductCategory[]> {
  const categories = await listCatalogCategories(prisma);

  return categories.map((category) => ({
    code: category.code,
    name: locale === "en" ? category.nameEn : category.nameZhCn,
  }));
}

export async function getPublishedProduct({
  locale,
  partNumber,
  prisma = getApplicationPrisma(),
  unitSystem = "metric",
}: {
  locale: PublicLocale;
  partNumber: string;
  prisma?: PrismaClient;
  unitSystem?: UnitSystem;
}): Promise<PublishedProductDetail | null> {
  const identity = await findCatalogProductIdentity(prisma, partNumber);

  if (!identity) {
    return null;
  }

  if (!identity.currentPublicationId) {
    return null;
  }

  const [[content], persistedSpecifications] = await Promise.all([
    listPublishedProductContent(prisma, [identity.currentPublicationId]),
    listProductSpecifications(prisma, identity.currentPublicationId),
  ]);

  if (!content) {
    return null;
  }

  const localized = localizeProduct(locale, identity, content);
  const languageHrefs = {
    en:
      productDetailPath("en", {
        partNumber: identity.partNumber,
        slug: content.slugEn,
      }) + (unitSystem === "imperial" ? "?unit=imperial" : ""),
    "zh-cn":
      productDetailPath("zh-cn", {
        partNumber: identity.partNumber,
        slug: content.slugZhCn,
      }) + (unitSystem === "imperial" ? "?unit=imperial" : ""),
  };

  const localizedHref = productDetailPath(locale, {
    partNumber: identity.partNumber,
    slug: localized.slug,
  });

  return {
    category: {
      code: identity.category.code,
      name: localized.categoryName,
    },
    href: localizedHref,
    id: identity.id,
    imagePath: identity.imagePath,
    languageHrefs,
    name: localized.name,
    partNumber: identity.partNumber,
    slug: localized.slug,
    specifications: persistedSpecifications.map((specification) =>
      formatProductSpecification(specification, { locale, unitSystem }),
    ),
    summary: localized.summary,
    unitSystem,
  };
}

export async function lookupPublishedProductNumber({
  locale,
  number,
  prisma = getApplicationPrisma(),
}: {
  locale: PublicLocale;
  number: string;
  prisma?: PrismaClient;
}): Promise<ProductNumberLookupResult> {
  const product = await getPublishedProduct({
    locale,
    partNumber: number,
    prisma,
  });

  if (product) {
    return { kind: "product-number", product };
  }

  const referenceRows = await findCatalogProductReferences(prisma, number);
  const contents = await listPublishedProductContent(
    prisma,
    referenceRows.flatMap(({ product: match }) =>
      match.currentPublicationId ? [match.currentPublicationId] : [],
    ),
  );
  const contentByProductId = new Map(
    contents.map((content) => [content.productId, content]),
  );
  const matchesByProductId = new Map<string, PublishedReferenceMatch>();

  for (const row of referenceRows) {
    const content = contentByProductId.get(row.product.id);

    if (!content) {
      continue;
    }

    const existing = matchesByProductId.get(row.product.id);

    if (existing) {
      existing.references.push({
        brand: row.brand,
        referenceNumber: row.referenceNumber,
      });
      continue;
    }

    const localized = localizeProduct(locale, row.product, content);
    matchesByProductId.set(row.product.id, {
      product: {
        category: {
          code: row.product.category.code,
          name: localized.categoryName,
        },
        href: productDetailPath(locale, {
          partNumber: row.product.partNumber,
          slug: localized.slug,
        }),
        id: row.product.id,
        imagePath: row.product.imagePath,
        name: localized.name,
        partNumber: row.product.partNumber,
        slug: localized.slug,
        summary: localized.summary,
      },
      references: [{ brand: row.brand, referenceNumber: row.referenceNumber }],
    });
  }

  const matches = [...matchesByProductId.values()];
  const trimmedNumber = number.trim();

  return matches.length > 0
    ? { kind: "reference-number", matches, number: trimmedNumber }
    : { kind: "not-found", number: trimmedNumber };
}

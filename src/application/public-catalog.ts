import type { PrismaClient } from "@/src/generated/prisma/client";
import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";
import {
  productDetailPath,
  type ProductCategoryCode,
} from "@/src/modules/catalog/public/product-identity";
import {
  findCatalogProductIdentity,
  listCatalogCategories,
  listCatalogProductIdentities,
  type CatalogProductIdentity,
} from "@/src/modules/catalog/server/catalog-query";
import {
  listPublishedProductContent,
  type PublishedProductContent,
} from "@/src/modules/content-publishing/server/product-public-content-query";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

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
}: {
  locale: PublicLocale;
  partNumber: string;
  prisma?: PrismaClient;
}): Promise<PublishedProductDetail | null> {
  const identity = await findCatalogProductIdentity(prisma, partNumber);

  if (!identity) {
    return null;
  }

  if (!identity.currentPublicationId) {
    return null;
  }

  const [content] = await listPublishedProductContent(prisma, [
    identity.currentPublicationId,
  ]);

  if (!content) {
    return null;
  }

  const localized = localizeProduct(locale, identity, content);
  const languageHrefs = {
    en: productDetailPath("en", {
      partNumber: identity.partNumber,
      slug: content.slugEn,
    }),
    "zh-cn": productDetailPath("zh-cn", {
      partNumber: identity.partNumber,
      slug: content.slugZhCn,
    }),
  };

  return {
    category: {
      code: identity.category.code,
      name: localized.categoryName,
    },
    href: languageHrefs[locale],
    id: identity.id,
    imagePath: identity.imagePath,
    languageHrefs,
    name: localized.name,
    partNumber: identity.partNumber,
    slug: localized.slug,
    summary: localized.summary,
  };
}

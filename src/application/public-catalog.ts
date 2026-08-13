import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import {
  productDetailPath,
  resolveExactNumberCandidates,
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
import {
  type LocalizedVehicleFitmentOption,
  type VehicleFitmentSelection,
} from "@/src/modules/catalog/public/fitments";
import {
  findCatalogFitmentPublicationIdsByVehicle,
  listCatalogVehicleFitments,
} from "@/src/modules/catalog/server/fitment-query";

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
  product: PublishedCatalogProduct & {
    keySpecifications: ProductSpecificationDisplay[];
  };
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

function createPublishedCatalogProduct(
  locale: PublicLocale,
  identity: CatalogProductIdentity,
  content: PublishedProductContent,
): PublishedCatalogProduct {
  const localized = localizeProduct(locale, identity, content);

  return {
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
  };
}

async function assemblePublishedCatalogProducts(
  locale: PublicLocale,
  prisma: ApplicationDatabase,
  identities: CatalogProductIdentity[],
): Promise<PublishedCatalogProduct[]> {
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

    return content
      ? [createPublishedCatalogProduct(locale, identity, content)]
      : [];
  });
}

export async function listPublishedProducts({
  categoryCode,
  locale,
  prisma = getApplicationPrisma(),
}: {
  categoryCode?: ProductCategoryCode;
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}): Promise<PublishedCatalogProduct[]> {
  const identities = await listCatalogProductIdentities(prisma, categoryCode);

  return assemblePublishedCatalogProducts(locale, prisma, identities);
}

export async function listProductCategories({
  locale,
  prisma = getApplicationPrisma(),
}: {
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}): Promise<LocalizedProductCategory[]> {
  const categories = await listCatalogCategories(prisma);

  return categories.map((category) => ({
    code: category.code,
    name: locale === "en" ? category.nameEn : category.nameZhCn,
  }));
}

export async function listPublishedVehicleFitmentOptions({
  locale,
  prisma = getApplicationPrisma(),
}: {
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}): Promise<LocalizedVehicleFitmentOption[]> {
  const [fitments, identities] = await Promise.all([
    listCatalogVehicleFitments(prisma),
    listCatalogProductIdentities(prisma),
  ]);
  const identityByPublicationId = new Map(
    identities.flatMap((identity) =>
      identity.currentPublicationId
        ? ([[identity.currentPublicationId, identity]] as const)
        : [],
    ),
  );

  return fitments.flatMap((fitment) => {
    const identity = identityByPublicationId.get(fitment.publicationId);

    return identity
      ? [
          {
            ...fitment,
            category: {
              code: identity.category.code,
              name:
                locale === "en"
                  ? identity.category.nameEn
                  : identity.category.nameZhCn,
            },
          },
        ]
      : [];
  });
}

export async function findPublishedProductsByVehicle({
  locale,
  prisma = getApplicationPrisma(),
  selection,
}: {
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
  selection: VehicleFitmentSelection;
}): Promise<PublishedCatalogProduct[]> {
  const [publicationIds, identities] = await Promise.all([
    findCatalogFitmentPublicationIdsByVehicle(prisma, selection),
    listCatalogProductIdentities(prisma, selection.categoryCode),
  ]);
  const publicationIdSet = new Set(publicationIds);
  const matchingIdentities = identities.filter(
    ({ currentPublicationId }) =>
      currentPublicationId !== null &&
      publicationIdSet.has(currentPublicationId),
  );

  return assemblePublishedCatalogProducts(locale, prisma, matchingIdentities);
}

export async function getPublishedProduct({
  locale,
  partNumber,
  prisma = getApplicationPrisma(),
  unitSystem = "metric",
}: {
  locale: PublicLocale;
  partNumber: string;
  prisma?: ApplicationDatabase;
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

  const publishedProduct = createPublishedCatalogProduct(
    locale,
    identity,
    content,
  );
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

  return {
    ...publishedProduct,
    languageHrefs,
    specifications: persistedSpecifications.map((specification) =>
      formatProductSpecification(specification, { locale, unitSystem }),
    ),
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
  prisma?: ApplicationDatabase;
}): Promise<ProductNumberLookupResult> {
  const product = await getPublishedProduct({
    locale,
    partNumber: number,
    prisma,
  });

  const directResolution = resolveExactNumberCandidates({
    product,
    references: [],
  });

  if (directResolution.kind === "product-number") {
    return directResolution;
  }

  const publishedIdentities = await listCatalogProductIdentities(prisma);
  const identityByPublicationId = new Map(
    publishedIdentities.flatMap((identity) =>
      identity.currentPublicationId
        ? ([[identity.currentPublicationId, identity]] as const)
        : [],
    ),
  );
  const referenceRows = await findCatalogProductReferences(prisma, number, [
    ...identityByPublicationId.keys(),
  ]);
  const contents = await listPublishedProductContent(
    prisma,
    referenceRows.map(({ publicationId }) => publicationId),
  );
  const contentByProductId = new Map(
    contents.map((content) => [content.productId, content]),
  );
  const matchesByProductId = new Map<string, PublishedReferenceMatch>();

  for (const row of referenceRows) {
    const identity = identityByPublicationId.get(row.publicationId);

    if (!identity) {
      continue;
    }

    const content = contentByProductId.get(identity.id);

    if (!content) {
      continue;
    }

    const existing = matchesByProductId.get(identity.id);

    if (existing) {
      existing.references.push({
        brand: row.brand,
        referenceNumber: row.referenceNumber,
      });
      continue;
    }

    matchesByProductId.set(identity.id, {
      product: {
        ...createPublishedCatalogProduct(locale, identity, content),
        keySpecifications: [],
      },
      references: [{ brand: row.brand, referenceNumber: row.referenceNumber }],
    });
  }

  const publicationIdByProductId = new Map(
    [...identityByPublicationId].map(([publicationId, product]) => [
      product.id,
      publicationId,
    ]),
  );
  const matches = await Promise.all(
    [...matchesByProductId.values()]
      .sort((left, right) =>
        left.product.partNumber.localeCompare(right.product.partNumber),
      )
      .map(async (match) => {
        const publicationId = publicationIdByProductId.get(match.product.id);

        if (!publicationId) {
          return match;
        }

        const specifications = await listProductSpecifications(
          prisma,
          publicationId,
        );

        return {
          ...match,
          product: {
            ...match.product,
            keySpecifications: specifications
              .map((specification) =>
                formatProductSpecification(specification, {
                  locale,
                  unitSystem: "metric",
                }),
              )
              .filter(({ unit }) => unit !== null)
              .slice(0, 3),
          },
        };
      }),
  );
  const trimmedNumber = number.trim();

  const referenceResolution = resolveExactNumberCandidates({
    product: null,
    references: matches,
  });

  return referenceResolution.kind === "reference-number"
    ? {
        kind: "reference-number",
        matches: [...referenceResolution.references],
        number: trimmedNumber,
      }
    : { kind: "not-found", number: trimmedNumber };
}

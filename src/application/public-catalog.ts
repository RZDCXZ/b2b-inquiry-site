import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import {
  productDetailPath,
  resolveExactNumberCandidates,
  type LocalizedProductCategory,
  type ProductCategoryCode,
} from "@/src/modules/catalog/public/product-identity";
import {
  findCatalogProductIdentity,
  findCatalogProductReferences,
  findCatalogProductIdentitiesBySpecifications,
  listCatalogCategories,
  listPublishedCatalogProductIdentities,
  type CatalogProductIdentity,
  type CatalogReplacementProductIdentity,
} from "@/src/modules/catalog/server/catalog-query";
import {
  SPECIFICATION_FILTER_PAGE_SIZE,
  type SpecificationFilter,
} from "@/src/modules/catalog/public/specification-filters";
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
import {
  listCatalogSpecificationAttributeDefinitions,
  listProductSpecifications,
  type CatalogSpecificationFilterDefinition,
} from "@/src/modules/catalog/server/product-specification-query";
import {
  parseSpecificationFilterRequest,
  type CatalogSearchParams,
  type LocalizedSpecificationFilterDefinition,
  type ParsedSpecificationFilterRequest,
} from "@/src/modules/catalog/public/specification-filters";
import {
  type LocalizedVehicleFitmentOption,
  type VehicleFitmentSelection,
} from "@/src/modules/catalog/public/fitments";
import {
  findCatalogFitmentPublicationIdsByVehicle,
  listCatalogVehicleFitments,
} from "@/src/modules/catalog/server/fitment-query";
import type { PublicProductStatus } from "@/src/modules/catalog/public/product-lifecycle";

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

export type PublishedProductDetail = PublishedCatalogProduct & {
  languageHrefs: Record<PublicLocale, string>;
  replacement: PublishedCatalogProduct | null;
  specifications: ProductSpecificationDisplay[];
  status: PublicProductStatus;
  unitSystem: UnitSystem;
};

export type SpecificationSearchProduct = PublishedCatalogProduct & {
  keySpecifications: ProductSpecificationDisplay[];
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
  identity: CatalogProductIdentity | CatalogReplacementProductIdentity,
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
  identity: CatalogProductIdentity | CatalogReplacementProductIdentity,
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
  const identities = await listPublishedCatalogProductIdentities(
    prisma,
    categoryCode,
  );

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

function localizeSpecificationFilterDefinitions(
  definitions: CatalogSpecificationFilterDefinition[],
  locale: PublicLocale,
  categoryCode: ProductCategoryCode,
): LocalizedSpecificationFilterDefinition[] {
  return definitions
    .filter(
      (definition) =>
        definition.categoryCode === categoryCode && definition.filterable,
    )
    .map((definition) => ({
      baseUnit: definition.baseUnit,
      code: definition.code,
      dataType: definition.dataType,
      label: locale === "en" ? definition.nameEn : definition.nameZhCn,
      maximumDecimalValue: definition.maximumDecimalValue,
      minimumDecimalValue: definition.minimumDecimalValue,
      options: definition.options.map((option) => ({
        label: locale === "en" ? option.labelEn : option.labelZhCn,
        value: option.code,
      })),
    }));
}

export async function listSpecificationFilterDefinitions({
  categoryCode,
  locale,
  prisma = getApplicationPrisma(),
}: {
  categoryCode: ProductCategoryCode;
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}): Promise<LocalizedSpecificationFilterDefinition[]> {
  return localizeSpecificationFilterDefinitions(
    await listCatalogSpecificationAttributeDefinitions(prisma),
    locale,
    categoryCode,
  );
}

export async function prepareSpecificationFilterRequest({
  locale,
  prisma = getApplicationPrisma(),
  query,
}: {
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
  query: CatalogSearchParams;
}): Promise<
  ParsedSpecificationFilterRequest & {
    definitions: LocalizedSpecificationFilterDefinition[];
  }
> {
  const definitions =
    await listCatalogSpecificationAttributeDefinitions(prisma);
  const parsed = parseSpecificationFilterRequest({
    definitions: definitions.map((definition) => ({
      categoryCode: definition.categoryCode,
      code: definition.code,
      dataType: definition.dataType,
      filterable: definition.filterable,
      maximumDecimalValue: definition.maximumDecimalValue,
      minimumDecimalValue: definition.minimumDecimalValue,
      options: definition.options.map((option) => ({ value: option.code })),
    })),
    query,
  });

  return {
    ...parsed,
    definitions: parsed.categoryCode
      ? localizeSpecificationFilterDefinitions(
          definitions,
          locale,
          parsed.categoryCode,
        )
      : [],
  };
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
    listPublishedCatalogProductIdentities(prisma),
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
    listPublishedCatalogProductIdentities(prisma, selection.categoryCode),
  ]);
  const publicationIdSet = new Set(publicationIds);
  const matchingIdentities = identities.filter(
    ({ currentPublicationId }) =>
      currentPublicationId !== null &&
      publicationIdSet.has(currentPublicationId),
  );

  return assemblePublishedCatalogProducts(locale, prisma, matchingIdentities);
}

export async function searchPublishedProductsBySpecifications({
  categoryCode,
  filters,
  locale,
  page,
  prisma = getApplicationPrisma(),
  unitSystem,
}: {
  categoryCode: ProductCategoryCode;
  filters: SpecificationFilter[];
  locale: PublicLocale;
  page: number;
  prisma?: ApplicationDatabase;
  unitSystem: UnitSystem;
}): Promise<{
  page: number;
  pageCount: number;
  pageSize: number;
  products: SpecificationSearchProduct[];
  total: number;
}> {
  const { identities, total } =
    await findCatalogProductIdentitiesBySpecifications(prisma, {
      categoryCode,
      filters,
      page,
      pageSize: SPECIFICATION_FILTER_PAGE_SIZE,
    });

  const publishedProducts = await assemblePublishedCatalogProducts(
    locale,
    prisma,
    identities,
  );
  const publicationIdByProductId = new Map(
    identities.flatMap((identity) =>
      identity.currentPublicationId
        ? ([[identity.id, identity.currentPublicationId]] as const)
        : [],
    ),
  );
  const products = await Promise.all(
    publishedProducts.map(async (product) => {
      const publicationId = publicationIdByProductId.get(product.id);
      const specifications = publicationId
        ? await listProductSpecifications(prisma, publicationId)
        : [];

      return {
        ...product,
        keySpecifications: specifications
          .map((specification) =>
            formatProductSpecification(specification, { locale, unitSystem }),
          )
          .filter(({ unit }) => unit !== null)
          .slice(0, 3),
      };
    }),
  );

  return {
    page,
    pageCount: Math.max(1, Math.ceil(total / SPECIFICATION_FILTER_PAGE_SIZE)),
    pageSize: SPECIFICATION_FILTER_PAGE_SIZE,
    products,
    total,
  };
}

export async function getPublishedProduct({
  knownIdentity,
  locale,
  partNumber,
  prisma = getApplicationPrisma(),
  unitSystem = "metric",
}: {
  knownIdentity?: CatalogProductIdentity;
  locale: PublicLocale;
  partNumber: string;
  prisma?: ApplicationDatabase;
  unitSystem?: UnitSystem;
}): Promise<PublishedProductDetail | null> {
  const identity =
    knownIdentity ?? (await findCatalogProductIdentity(prisma, partNumber));

  if (!identity) {
    return null;
  }

  if (!identity.currentPublicationId || identity.status === "draft") {
    return null;
  }

  const replacementPublicationId =
    identity.replacementProduct?.status !== "draft"
      ? identity.replacementProduct?.currentPublicationId
      : null;
  const [[content], persistedSpecifications, replacementContents] =
    await Promise.all([
      listPublishedProductContent(prisma, [identity.currentPublicationId]),
      listProductSpecifications(prisma, identity.currentPublicationId),
      listPublishedProductContent(
        prisma,
        replacementPublicationId ? [replacementPublicationId] : [],
      ),
    ]);

  if (!content) {
    return null;
  }

  const publishedProduct = createPublishedCatalogProduct(
    locale,
    identity,
    content,
  );
  const replacementContent = replacementContents[0];
  const replacement =
    identity.replacementProduct && replacementContent
      ? createPublishedCatalogProduct(
          locale,
          identity.replacementProduct,
          replacementContent,
        )
      : null;
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
    replacement:
      replacement && unitSystem === "imperial"
        ? { ...replacement, href: `${replacement.href}?unit=imperial` }
        : replacement,
    specifications: persistedSpecifications.map((specification) =>
      formatProductSpecification(specification, { locale, unitSystem }),
    ),
    status: identity.status,
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

  const publishedIdentities =
    await listPublishedCatalogProductIdentities(prisma);
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

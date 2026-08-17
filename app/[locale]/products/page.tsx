import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  findPublishedProductsByVehicle,
  listProductCategories,
  listPublishedProducts,
  listPublishedVehicleFitmentOptions,
  lookupPublishedProductNumber,
  prepareSpecificationFilterRequest,
  searchPublishedProductsBySpecifications,
} from "@/src/application/public-catalog";
import {
  bilingualPublicPaths,
  createLocalizedPageMetadata,
} from "@/src/application/public-seo";
import { getPublicSiteShellData } from "@/src/application/public-site-shell";
import { CatalogPage } from "@/src/components/public/catalog-page";
import { ProductNumberLookupPage } from "@/src/components/public/product-number-lookup-page";
import {
  CATALOG_ROUTE_PARAMS_SCHEMA,
  CATALOG_SEARCH_PARAMS_SCHEMA,
} from "@/src/modules/catalog/public/product-identity";
import { getCatalogCopy } from "@/src/modules/content-publishing/public/catalog-copy";
import { VEHICLE_FINDER_SEARCH_PARAMS_SCHEMA } from "@/src/modules/catalog/public/fitments";
import {
  createSpecificationFilterSearchParams,
  type SpecificationFilterIssue,
} from "@/src/modules/catalog/public/specification-filters";

type CatalogRouteProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: CatalogRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const parsedParams = CATALOG_ROUTE_PARAMS_SCHEMA.safeParse({ locale });

  if (!parsedParams.success) {
    return {};
  }

  const copy = getCatalogCopy(parsedParams.data.locale);
  return createLocalizedPageMetadata({
    description: copy.metadataDescription,
    locale: parsedParams.data.locale,
    paths: bilingualPublicPaths("/products"),
    title: copy.metadataTitle,
  });
}

export default async function ProductsPage({
  params,
  searchParams,
}: CatalogRouteProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const parsedParams = CATALOG_ROUTE_PARAMS_SCHEMA.safeParse({ locale });
  const parsedQuery = CATALOG_SEARCH_PARAMS_SCHEMA.safeParse(query);
  const parsedVehicleQuery =
    VEHICLE_FINDER_SEARCH_PARAMS_SCHEMA.safeParse(query);

  if (!parsedParams.success) {
    notFound();
  }

  const publicLocale = parsedParams.data.locale;
  const partNumber = parsedQuery.success ? parsedQuery.data.part : undefined;

  if (partNumber) {
    const [lookup, shell] = await Promise.all([
      lookupPublishedProductNumber({
        locale: publicLocale,
        number: partNumber,
      }),
      getPublicSiteShellData({ locale: publicLocale }),
    ]);

    if (lookup.kind === "product-number") {
      redirect(lookup.product.href);
    }

    return (
      <ProductNumberLookupPage
        locale={publicLocale}
        lookup={lookup}
        shell={shell}
      />
    );
  }

  const [initialSpecificationRequest, categories, vehicleFitments, shell] =
    await Promise.all([
      prepareSpecificationFilterRequest({ locale: publicLocale, query }),
      listProductCategories({ locale: publicLocale }),
      listPublishedVehicleFitmentOptions({ locale: publicLocale }),
      getPublicSiteShellData({ locale: publicLocale }),
    ]);
  let specificationRequest = initialSpecificationRequest;

  const categoryCode = specificationRequest.active
    ? specificationRequest.categoryCode
    : parsedQuery.success
      ? parsedQuery.data.category
      : undefined;
  const vehicleQuery = parsedVehicleQuery.success
    ? parsedVehicleQuery.data
    : undefined;
  const vehicleSelection =
    vehicleQuery?.finder === "vehicle" &&
    vehicleQuery.make &&
    vehicleQuery.model &&
    vehicleQuery.year &&
    vehicleQuery.engine &&
    vehicleQuery.category
      ? {
          categoryCode: vehicleQuery.category,
          engineId: vehicleQuery.engine,
          makeId: vehicleQuery.make,
          modelId: vehicleQuery.model,
          year: vehicleQuery.year,
        }
      : undefined;
  let page = 1;
  let pageCount = 1;
  let resultTotal: number | undefined;
  let products;

  if (specificationRequest.active && categoryCode) {
    let result = await searchPublishedProductsBySpecifications({
      categoryCode,
      filters: specificationRequest.filters,
      locale: publicLocale,
      page: specificationRequest.page,
      unitSystem: specificationRequest.unitSystem,
    });

    if (specificationRequest.page > result.pageCount) {
      const issues: SpecificationFilterIssue[] = [
        ...specificationRequest.issues,
        {
          code: "page_out_of_range",
          parameter: String(specificationRequest.page),
        },
      ];
      result = await searchPublishedProductsBySpecifications({
        categoryCode,
        filters: specificationRequest.filters,
        locale: publicLocale,
        page: result.pageCount,
        unitSystem: specificationRequest.unitSystem,
      });
      specificationRequest = {
        ...specificationRequest,
        issues,
        page: result.page,
      };
    }

    products = result.products;
    page = result.page;
    pageCount = result.pageCount;
    resultTotal = result.total;
  } else {
    products = vehicleSelection
      ? await findPublishedProductsByVehicle({
          locale: publicLocale,
          selection: vehicleSelection,
        })
      : await listPublishedProducts({ categoryCode, locale: publicLocale });
  }
  const vehicleQueryString = vehicleSelection
    ? new URLSearchParams({
        finder: "vehicle",
        make: vehicleSelection.makeId,
        model: vehicleSelection.modelId,
        year: String(vehicleSelection.year),
        engine: vehicleSelection.engineId,
        category: vehicleSelection.categoryCode,
      }).toString()
    : undefined;
  const specificationQueryString =
    specificationRequest.active && categoryCode
      ? createSpecificationFilterSearchParams({
          categoryCode,
          filters: specificationRequest.filters,
          page,
          unitSystem: specificationRequest.unitSystem,
        }).toString()
      : undefined;

  return (
    <CatalogPage
      categories={categories}
      filterDefinitions={specificationRequest.definitions}
      filters={specificationRequest.filters}
      initialFinderMode={
        specificationRequest.active
          ? "specifications"
          : vehicleQuery?.finder === "vehicle"
            ? "vehicle"
            : undefined
      }
      initialVehicleSelection={
        vehicleQuery?.finder === "vehicle"
          ? {
              categoryCode: vehicleQuery.category,
              engineId: vehicleQuery.engine,
              makeId: vehicleQuery.make,
              modelId: vehicleQuery.model,
              year: vehicleQuery.year,
            }
          : undefined
      }
      locale={publicLocale}
      page={page}
      pageCount={pageCount}
      products={products}
      resultTotal={resultTotal}
      selectedCategory={categories.find(({ code }) => code === categoryCode)}
      shell={shell}
      specificationIssues={specificationRequest.issues}
      specificationQueryString={specificationQueryString}
      unitSystem={specificationRequest.unitSystem}
      vehicleFitments={vehicleFitments}
      vehicleQueryString={vehicleQueryString}
    />
  );
}

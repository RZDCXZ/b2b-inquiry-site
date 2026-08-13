import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  findPublishedProductsByVehicle,
  listProductCategories,
  listPublishedProducts,
  listPublishedVehicleFitmentOptions,
  lookupPublishedProductNumber,
} from "@/src/application/public-catalog";
import { CatalogPage } from "@/src/components/public/catalog-page";
import { ProductNumberLookupPage } from "@/src/components/public/product-number-lookup-page";
import {
  CATALOG_ROUTE_PARAMS_SCHEMA,
  CATALOG_SEARCH_PARAMS_SCHEMA,
} from "@/src/modules/catalog/public/product-identity";
import { getCatalogCopy } from "@/src/modules/content-publishing/public/catalog-copy";
import { VEHICLE_FINDER_SEARCH_PARAMS_SCHEMA } from "@/src/modules/catalog/public/fitments";

type CatalogRouteProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string | string[];
    engine?: string | string[];
    finder?: string | string[];
    make?: string | string[];
    model?: string | string[];
    part?: string | string[];
    year?: string | string[];
  }>;
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
  return {
    description: copy.metadataDescription,
    title: copy.metadataTitle,
  };
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
    const lookup = await lookupPublishedProductNumber({
      locale: publicLocale,
      number: partNumber,
    });

    if (lookup.kind === "product-number") {
      redirect(lookup.product.href);
    }

    return <ProductNumberLookupPage locale={publicLocale} lookup={lookup} />;
  }

  const categoryCode = parsedQuery.success
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
  const [categories, products, vehicleFitments] = await Promise.all([
    listProductCategories({ locale: publicLocale }),
    vehicleSelection
      ? findPublishedProductsByVehicle({
          locale: publicLocale,
          selection: vehicleSelection,
        })
      : listPublishedProducts({ categoryCode, locale: publicLocale }),
    listPublishedVehicleFitmentOptions({ locale: publicLocale }),
  ]);
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

  return (
    <CatalogPage
      categories={categories}
      initialFinderMode={
        vehicleQuery?.finder === "vehicle" ? "vehicle" : undefined
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
      products={products}
      selectedCategory={categories.find(({ code }) => code === categoryCode)}
      vehicleFitments={vehicleFitments}
      vehicleQueryString={vehicleQueryString}
    />
  );
}

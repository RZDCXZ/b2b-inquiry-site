import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { getPublishedProduct } from "@/src/application/public-catalog";
import { ProductDetailPage } from "@/src/components/public/product-detail-page";
import { PRODUCT_ROUTE_PARAMS_SCHEMA } from "@/src/modules/catalog/public/product-identity";
import { UNIT_SYSTEM_SCHEMA } from "@/src/modules/catalog/public/specifications";

type ProductRouteProps = {
  params: Promise<{ locale: string; partNumber: string; slug: string }>;
  searchParams: Promise<{ unit?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: ProductRouteProps): Promise<Metadata> {
  const { locale, partNumber, slug } = await params;
  const parsedParams = PRODUCT_ROUTE_PARAMS_SCHEMA.safeParse({
    locale,
    partNumber,
    slug,
  });

  if (!parsedParams.success) {
    return {};
  }

  const product = await getPublishedProduct({
    locale: parsedParams.data.locale,
    partNumber: parsedParams.data.partNumber,
  });

  return product ? { description: product.summary, title: product.name } : {};
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductRouteProps) {
  const [{ locale, partNumber, slug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const parsedParams = PRODUCT_ROUTE_PARAMS_SCHEMA.safeParse({
    locale,
    partNumber,
    slug,
  });

  if (!parsedParams.success) {
    notFound();
  }

  const parsedUnitSystem = UNIT_SYSTEM_SCHEMA.safeParse(query.unit);
  const unitSystem = parsedUnitSystem.success
    ? parsedUnitSystem.data
    : "metric";

  const product = await getPublishedProduct({
    locale: parsedParams.data.locale,
    partNumber: parsedParams.data.partNumber,
    unitSystem,
  });

  if (!product) {
    notFound();
  }

  if (
    parsedParams.data.partNumber !== product.partNumber ||
    parsedParams.data.slug !== product.slug
  ) {
    permanentRedirect(
      product.href + (unitSystem === "imperial" ? "?unit=imperial" : ""),
    );
  }

  return (
    <ProductDetailPage locale={parsedParams.data.locale} product={product} />
  );
}

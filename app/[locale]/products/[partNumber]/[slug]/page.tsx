import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { getPublishedProduct } from "@/src/application/public-catalog";
import {
  createLocalizedPageMetadata,
  createProductStructuredData,
} from "@/src/application/public-seo";
import { getPublicSiteShellData } from "@/src/application/public-site-shell";
import { ProductDetailPage } from "@/src/components/public/product-detail-page";
import { PublicStructuredData } from "@/src/components/public/structured-data";
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

  return product
    ? createLocalizedPageMetadata({
        description: product.seoDescription,
        locale: parsedParams.data.locale,
        paths: product.languageHrefs,
        title: product.seoTitle,
      })
    : {};
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

  const [product, shell] = await Promise.all([
    getPublishedProduct({
      locale: parsedParams.data.locale,
      partNumber: parsedParams.data.partNumber,
      unitSystem,
    }),
    getPublicSiteShellData({ locale: parsedParams.data.locale }),
  ]);

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
    <>
      <PublicStructuredData
        data={createProductStructuredData({
          locale: parsedParams.data.locale,
          product,
        })}
      />
      <ProductDetailPage
        locale={parsedParams.data.locale}
        product={product}
        shell={shell}
      />
    </>
  );
}

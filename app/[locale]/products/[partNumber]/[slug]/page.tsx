import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { getPublishedProduct } from "@/src/application/public-catalog";
import { ProductDetailPage } from "@/src/components/public/product-detail-page";
import { PRODUCT_ROUTE_PARAMS_SCHEMA } from "@/src/modules/catalog/public/product-identity";

type ProductRouteProps = {
  params: Promise<{ locale: string; partNumber: string; slug: string }>;
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

export default async function ProductPage({ params }: ProductRouteProps) {
  const { locale, partNumber, slug } = await params;
  const parsedParams = PRODUCT_ROUTE_PARAMS_SCHEMA.safeParse({
    locale,
    partNumber,
    slug,
  });

  if (!parsedParams.success) {
    notFound();
  }

  const product = await getPublishedProduct({
    locale: parsedParams.data.locale,
    partNumber: parsedParams.data.partNumber,
  });

  if (!product) {
    notFound();
  }

  if (
    parsedParams.data.partNumber !== product.partNumber ||
    parsedParams.data.slug !== product.slug
  ) {
    permanentRedirect(product.href);
  }

  return (
    <ProductDetailPage locale={parsedParams.data.locale} product={product} />
  );
}

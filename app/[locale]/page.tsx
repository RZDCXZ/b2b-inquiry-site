import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomePage } from "@/src/components/public/home-page";
import { HOME_SEARCH_PARAMS_SCHEMA } from "@/src/modules/catalog/public/product-identity";
import { getHomeMetadataCopy } from "@/src/modules/content-publishing/public/home-copy";
import { isPublicLocale } from "@/src/modules/site-config/public/locales";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ finder?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isPublicLocale(locale)) {
    return {};
  }

  return getHomeMetadataCopy(locale);
}

export default async function LocaleHomePage({
  params,
  searchParams,
}: LocalePageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);

  if (!isPublicLocale(locale)) {
    notFound();
  }

  const parsedQuery = HOME_SEARCH_PARAMS_SCHEMA.safeParse(query);

  return (
    <HomePage
      initialFinderMode={
        parsedQuery.success ? parsedQuery.data.finder : undefined
      }
      locale={locale}
    />
  );
}

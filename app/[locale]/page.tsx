import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { listPublishedVehicleFitmentOptions } from "@/src/application/public-catalog";
import {
  bilingualPublicPaths,
  createLocalizedPageMetadata,
} from "@/src/application/public-seo";
import { HomePage } from "@/src/components/public/home-page";
import { HOME_SEARCH_PARAMS_SCHEMA } from "@/src/modules/catalog/public/product-identity";
import { getHomeMetadataCopy } from "@/src/modules/content-publishing/public/home-copy";
import { isPublicLocale } from "@/src/modules/site-config/public/locales";
import { getPublishedCorePage } from "@/src/application/site-content-management";
import { getPublicSiteShellData } from "@/src/application/public-site-shell";

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

  const page = await getPublishedCorePage({ key: "home", locale });
  const copy = page
    ? { description: page.content.lede, title: page.content.title }
    : getHomeMetadataCopy(locale);
  return createLocalizedPageMetadata({
    ...copy,
    locale,
    paths: bilingualPublicPaths(""),
  });
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
  const [vehicleFitments, content, shell] = await Promise.all([
    listPublishedVehicleFitmentOptions({ locale }),
    getPublishedCorePage({ key: "home", locale }),
    getPublicSiteShellData({ locale }),
  ]);
  if (!content) notFound();

  return (
    <HomePage
      initialFinderMode={
        parsedQuery.success ? parsedQuery.data.finder : undefined
      }
      content={content.content}
      locale={locale}
      shell={shell}
      vehicleFitments={vehicleFitments}
    />
  );
}

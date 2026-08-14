import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPublishedCorePage,
  listPublishedArticles,
} from "@/src/application/site-content-management";
import { CoreContentPage } from "@/src/components/public/core-content-page";
import { isPublicLocale } from "@/src/modules/site-config/public/locales";

type PageProperties = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProperties): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return {};
  const page = await getPublishedCorePage({
    key: "technical_resources",
    locale,
  });
  return page
    ? { description: page.content.lede, title: page.content.title }
    : {};
}

export default async function ResourcesPage({ params }: PageProperties) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const [page, articles] = await Promise.all([
    getPublishedCorePage({ key: "technical_resources", locale }),
    listPublishedArticles({ locale }),
  ]);
  if (!page) notFound();
  return (
    <CoreContentPage
      activeNavigationAnchor="resources"
      articles={articles}
      content={page.content}
      locale={locale}
    />
  );
}

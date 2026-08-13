import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomePage } from "@/src/components/public/home-page";
import { getHomeMetadataCopy } from "@/src/modules/content-publishing/public/home-copy";
import { isPublicLocale } from "@/src/modules/site-config/public/locales";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
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

export default async function LocaleHomePage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isPublicLocale(locale)) {
    notFound();
  }

  return <HomePage locale={locale} />;
}

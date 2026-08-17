import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  bilingualPublicPaths,
  createLocalizedPageMetadata,
} from "@/src/application/public-seo";
import { getPublishedCorePage } from "@/src/application/site-content-management";
import { getPublicSiteShellData } from "@/src/application/public-site-shell";
import { CoreContentPage } from "@/src/components/public/core-content-page";
import { isPublicLocale } from "@/src/modules/site-config/public/locales";

type PageProperties = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProperties): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return {};
  const page = await getPublishedCorePage({ key: "private_label", locale });
  return page
    ? createLocalizedPageMetadata({
        description: page.content.lede,
        locale,
        paths: bilingualPublicPaths("/private-label"),
        title: page.content.title,
      })
    : {};
}

export default async function PrivateLabelPage({ params }: PageProperties) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const [page, shell] = await Promise.all([
    getPublishedCorePage({ key: "private_label", locale }),
    getPublicSiteShellData({ locale }),
  ]);
  if (!page) notFound();
  return (
    <CoreContentPage
      activeNavigationAnchor="private-label"
      content={page.content}
      locale={locale}
      shell={shell}
    />
  );
}

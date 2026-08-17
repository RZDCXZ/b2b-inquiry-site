import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import "../globals.css";

import { createOrganizationStructuredData } from "@/src/application/public-seo";
import { getPublicSiteConfiguration } from "@/src/application/site-configuration";
import { PublicStructuredData } from "@/src/components/public/structured-data";
import {
  isPublicLocale,
  localeHtmlLanguage,
  PUBLIC_LOCALES,
} from "@/src/modules/site-config/public/locales";
import {
  isPublicSeoMode,
  SEO_CANONICAL_ORIGIN,
} from "@/src/modules/site-config/server/seo-mode";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return {};

  const settings = await getPublicSiteConfiguration();
  const title =
    locale === "zh-cn"
      ? settings.defaultSeoTitleZhCn
      : settings.defaultSeoTitleEn;
  const publicSeoMode = isPublicSeoMode();
  return {
    description:
      locale === "zh-cn"
        ? settings.defaultSeoDescriptionZhCn
        : settings.defaultSeoDescriptionEn,
    ...(publicSeoMode
      ? { metadataBase: new URL(SEO_CANONICAL_ORIGIN) }
      : undefined),
    robots: { follow: publicSeoMode, index: publicSeoMode },
    title: { default: title, template: `%s | ${title}` },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isPublicLocale(locale)) {
    notFound();
  }

  const configuration = await getPublicSiteConfiguration();

  return (
    <html data-scroll-behavior="smooth" lang={localeHtmlLanguage(locale)}>
      <body>
        <PublicStructuredData
          data={createOrganizationStructuredData({ configuration, locale })}
        />
        {children}
      </body>
    </html>
  );
}

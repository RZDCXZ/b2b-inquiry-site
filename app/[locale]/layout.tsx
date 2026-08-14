import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import "../globals.css";

import { getPublicSiteConfiguration } from "@/src/application/site-configuration";
import {
  isPublicLocale,
  localeHtmlLanguage,
  PUBLIC_LOCALES,
} from "@/src/modules/site-config/public/locales";

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
  return {
    description:
      locale === "zh-cn"
        ? settings.defaultSeoDescriptionZhCn
        : settings.defaultSeoDescriptionEn,
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

  return (
    <html data-scroll-behavior="smooth" lang={localeHtmlLanguage(locale)}>
      <body>{children}</body>
    </html>
  );
}

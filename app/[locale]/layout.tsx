import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import "../globals.css";

import {
  isPublicLocale,
  localeHtmlLanguage,
  PUBLIC_LOCALES,
} from "@/src/modules/site-config/public/locales";

export const metadata: Metadata = {
  metadataBase: new URL("https://torquelis.example"),
  robots: {
    follow: false,
    index: false,
  },
  title: {
    default: "Torquelis Filters",
    template: "%s | Torquelis Filters",
  },
};

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
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

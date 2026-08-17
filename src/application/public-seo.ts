import type { Metadata } from "next";

import {
  localeHtmlLanguage,
  type PublicLocale,
} from "@/src/modules/site-config/public/locales";
import {
  isPublicSeoMode,
  SEO_CANONICAL_ORIGIN,
} from "@/src/modules/site-config/server/seo-mode";

type PublicPaths = Partial<Record<PublicLocale, string>>;

export function publicCanonicalUrl(path: string): string {
  return new URL(path, SEO_CANONICAL_ORIGIN).toString();
}

function languageTag(locale: PublicLocale): string {
  return localeHtmlLanguage(locale);
}

export function bilingualPublicPaths(route: string): PublicPaths {
  return {
    en: `/en${route}`,
    "zh-cn": `/zh-cn${route}`,
  };
}

export function createLocalizedPageMetadata({
  description,
  indexable = true,
  locale,
  paths,
  title,
}: {
  description?: string;
  indexable?: boolean;
  locale: PublicLocale;
  paths: PublicPaths;
  title: string;
}): Metadata {
  const publicSeoMode = isPublicSeoMode();
  const metadata: Metadata = {
    ...(description ? { description } : {}),
    robots: {
      follow: indexable && publicSeoMode,
      index: indexable && publicSeoMode,
    },
    title,
  };

  const currentPath = paths[locale];
  if (!indexable || !publicSeoMode || !currentPath) {
    return metadata;
  }

  return {
    ...metadata,
    alternates: {
      canonical: publicCanonicalUrl(currentPath),
      languages: Object.fromEntries(
        Object.entries(paths).map(([pathLocale, path]) => [
          localeHtmlLanguage(pathLocale as PublicLocale),
          publicCanonicalUrl(path),
        ]),
      ),
    },
  };
}

export function createOrganizationStructuredData({
  configuration,
  locale,
}: {
  configuration: {
    addressEn: string;
    addressZhCn: string;
    companyNameEn: string;
    companyNameZhCn: string;
    contactEmail: string;
    contactPhone: string;
    socialLinks: Record<string, string>;
  };
  locale: PublicLocale;
}) {
  const english = locale === "en";
  return {
    "@context": "https://schema.org",
    "@id": `${SEO_CANONICAL_ORIGIN}/#organization`,
    "@type": "Organization",
    address: english ? configuration.addressEn : configuration.addressZhCn,
    alternateName: english
      ? configuration.companyNameZhCn
      : configuration.companyNameEn,
    email: configuration.contactEmail,
    name: english ? configuration.companyNameEn : configuration.companyNameZhCn,
    sameAs: Object.values(configuration.socialLinks),
    telephone: configuration.contactPhone,
    url: publicCanonicalUrl(`/${locale}`),
  };
}

export function createProductStructuredData({
  locale,
  product,
}: {
  locale: PublicLocale;
  product: {
    category: { name: string };
    href: string;
    name: string;
    partNumber: string;
    status: "discontinued" | "published";
    summary: string;
  };
}) {
  const status =
    product.status === "discontinued"
      ? locale === "en"
        ? "Discontinued"
        : "已停产"
      : locale === "en"
        ? "Published"
        : "已发布";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    additionalProperty: {
      "@type": "PropertyValue",
      name: locale === "en" ? "Catalogue status" : "目录状态",
      value: status,
    },
    category: product.category.name,
    description: product.summary,
    manufacturer: { "@id": `${SEO_CANONICAL_ORIGIN}/#organization` },
    name: product.name,
    sku: product.partNumber,
    url: publicCanonicalUrl(product.href),
  };
}

export function createArticleStructuredData({
  article,
  locale,
}: {
  article: {
    excerpt: string;
    publishedAt: Date;
    slug: string;
    title: string;
  };
  locale: PublicLocale;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    datePublished: article.publishedAt.toISOString(),
    description: article.excerpt,
    headline: article.title,
    inLanguage: languageTag(locale),
    publisher: { "@id": `${SEO_CANONICAL_ORIGIN}/#organization` },
    url: publicCanonicalUrl(`/${locale}/resources/${article.slug}`),
  };
}

import {
  listPublishedArticles,
  listPublishedCorePageKeys,
} from "@/src/application/site-content-management";
import {
  bilingualPublicPaths,
  publicCanonicalUrl,
} from "@/src/application/public-seo";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import {
  CORE_PAGE_DEFINITIONS,
  type CorePageKey,
} from "@/src/modules/content-publishing/public/core-page-contracts";
import { productDetailPath } from "@/src/modules/catalog/public/product-identity";
import { listPublicCatalogProductIdentities } from "@/src/modules/catalog/server/catalog-query";
import { listPublishedProductContent } from "@/src/modules/content-publishing/server/product-public-content-query";
import {
  localeHtmlLanguage,
  type PublicLocale,
} from "@/src/modules/site-config/public/locales";

type SitemapEntry = {
  alternates: Record<string, string>;
  lastModified?: Date;
  url: string;
};

function languageAlternates(
  paths: Partial<Record<PublicLocale, string>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(paths).map(([locale, path]) => [
      localeHtmlLanguage(locale as PublicLocale),
      publicCanonicalUrl(path),
    ]),
  );
}

function entryForPath(
  path: string,
  languagePaths: Partial<Record<PublicLocale, string>>,
  lastModified?: Date,
): SitemapEntry {
  return {
    alternates: languageAlternates(languagePaths),
    lastModified,
    url: publicCanonicalUrl(path),
  };
}

function entriesForPaths(
  paths: Partial<Record<PublicLocale, string>>,
  lastModified?: Date,
): SitemapEntry[] {
  return Object.values(paths).map((path) =>
    entryForPath(path, paths, lastModified),
  );
}

function corePagePaths(key: CorePageKey) {
  return bilingualPublicPaths(CORE_PAGE_DEFINITIONS[key].route);
}

export async function listPublicSitemapEntries({
  prisma = getApplicationPrisma(),
}: { prisma?: ApplicationDatabase } = {}): Promise<SitemapEntry[]> {
  const [corePageKeys, products, englishArticles, chineseArticles] =
    await Promise.all([
      listPublishedCorePageKeys({ prisma }),
      listPublicCatalogProductIdentities(prisma),
      listPublishedArticles({ locale: "en", prisma }),
      listPublishedArticles({ locale: "zh-cn", prisma }),
    ]);
  const productContent = await listPublishedProductContent(
    prisma,
    products.flatMap(({ currentPublicationId }) =>
      currentPublicationId ? [currentPublicationId] : [],
    ),
  );
  const productContentById = new Map(
    productContent.map((content) => [content.productId, content]),
  );

  const corePageEntries = corePageKeys.flatMap((key) =>
    entriesForPaths(corePagePaths(key)),
  );
  const catalogEntries = entriesForPaths(bilingualPublicPaths("/products"));
  const productEntries = products.flatMap((product) => {
    const content = productContentById.get(product.id);
    const publication = product.currentPublication;
    return content && publication
      ? entriesForPaths(
          {
            en: productDetailPath("en", {
              partNumber: product.partNumber,
              slug: content.slugEn,
            }),
            "zh-cn": productDetailPath("zh-cn", {
              partNumber: product.partNumber,
              slug: content.slugZhCn,
            }),
          },
          content.publishedAt,
        )
      : [];
  });

  const articlePaths = new Map<string, Partial<Record<PublicLocale, string>>>();
  for (const article of [...englishArticles, ...chineseArticles]) {
    const paths = articlePaths.get(article.articleId) ?? {};
    paths[article.locale] =
      `/${article.locale}/resources/${encodeURIComponent(article.slug)}`;
    articlePaths.set(article.articleId, paths);
  }
  const articleEntries = [...englishArticles, ...chineseArticles].map(
    (article) => {
      const path = `/${article.locale}/resources/${encodeURIComponent(article.slug)}`;
      return entryForPath(
        path,
        articlePaths.get(article.articleId) ?? {},
        article.publishedAt,
      );
    },
  );

  return [
    ...corePageEntries,
    ...catalogEntries,
    ...productEntries,
    ...articleEntries,
  ]
    .filter(
      (entry, index, entries) =>
        entries.findIndex(({ url }) => url === entry.url) === index,
    )
    .sort((left, right) => left.url.localeCompare(right.url));
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const alternates = Object.entries(entry.alternates)
        .map(
          ([hreflang, href]) =>
            `<xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}"/>`,
        )
        .join("");
      const lastModified = entry.lastModified
        ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
        : "";
      return `<url><loc>${escapeXml(entry.url)}</loc>${alternates}${lastModified}</url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  createArticleStructuredData,
  createLocalizedPageMetadata,
} from "@/src/application/public-seo";
import { getPublishedArticle } from "@/src/application/site-content-management";
import { getPublicSiteShellData } from "@/src/application/public-site-shell";
import { ArticlePage } from "@/src/components/public/article-page";
import { PublicStructuredData } from "@/src/components/public/structured-data";
import { isPublicLocale } from "@/src/modules/site-config/public/locales";

type PageProperties = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({
  params,
}: PageProperties): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale)) return {};
  const article = await getPublishedArticle({ locale, slug });
  if (!article) return {};
  const paths = { [locale]: `/${locale}/resources/${article.slug}` };
  if (article.otherLanguage.available) {
    paths[article.otherLanguage.locale] =
      `/${article.otherLanguage.locale}/resources/${article.otherLanguage.slug}`;
  }
  return createLocalizedPageMetadata({
    description: article.seoDescription,
    locale,
    paths,
    title: article.seoTitle,
  });
}

export default async function ResourceArticlePage({ params }: PageProperties) {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale)) notFound();
  const [article, shell] = await Promise.all([
    getPublishedArticle({ locale, slug }),
    getPublicSiteShellData({ locale }),
  ]);
  if (!article) notFound();
  return (
    <>
      <PublicStructuredData
        data={createArticleStructuredData({ article, locale })}
      />
      <ArticlePage article={article} locale={locale} shell={shell} />
    </>
  );
}

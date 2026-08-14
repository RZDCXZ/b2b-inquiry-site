import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublishedArticle } from "@/src/application/site-content-management";
import { ArticlePage } from "@/src/components/public/article-page";
import { isPublicLocale } from "@/src/modules/site-config/public/locales";

type PageProperties = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({
  params,
}: PageProperties): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale)) return {};
  const article = await getPublishedArticle({ locale, slug });
  return article
    ? { description: article.seoDescription, title: article.seoTitle }
    : {};
}

export default async function ResourceArticlePage({ params }: PageProperties) {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale)) notFound();
  const article = await getPublishedArticle({ locale, slug });
  if (!article) notFound();
  return <ArticlePage article={article} locale={locale} />;
}

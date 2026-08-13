import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomePage } from "@/src/components/public/home-page";
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

  return {
    description:
      locale === "en"
        ? "Find commercial vehicle filtration products and send a structured inquiry."
        : "查找商用车滤清产品并提交结构化询盘。",
    title:
      locale === "en"
        ? "Commercial vehicle filter finder"
        : "商用车滤清产品查找",
  };
}

export default async function LocaleHomePage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isPublicLocale(locale)) {
    notFound();
  }

  return <HomePage locale={locale} />;
}

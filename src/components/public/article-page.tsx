import { CalendarBlank, Info } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { PublicSiteShellData } from "@/src/application/public-site-shell";
import { PublicFooter } from "@/src/components/public/public-footer";
import { PublicHeader } from "@/src/components/public/public-header";
import { RestrictedRichText } from "@/src/components/public/restricted-rich-text";
import { getHomeCopy } from "@/src/modules/content-publishing/public/home-copy";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

export type ArticlePageContent = {
  body: string;
  excerpt: string;
  otherLanguage:
    | { available: true; locale: PublicLocale; slug: string }
    | { available: false; locale: PublicLocale };
  publishedAt: Date;
  slug: string;
  title: string;
};

export function ArticlePage({
  article,
  languageHrefs: providedLanguageHrefs,
  locale,
  shell,
}: {
  article: ArticlePageContent;
  languageHrefs?: Partial<Record<PublicLocale, string>>;
  locale: PublicLocale;
  shell: PublicSiteShellData;
}) {
  const copy = getHomeCopy(locale);
  const languageHrefs: Partial<Record<PublicLocale, string>> = {
    [locale]: `/${locale}/resources/${article.slug}`,
  };
  if (article.otherLanguage.available) {
    languageHrefs[article.otherLanguage.locale] =
      `/${article.otherLanguage.locale}/resources/${article.otherLanguage.slug}`;
  }
  Object.assign(languageHrefs, providedLanguageHrefs);
  const unavailableLanguages:
    Partial<Record<PublicLocale, string>> | undefined = article.otherLanguage
    .available
    ? undefined
    : {
        [article.otherLanguage.locale]:
          locale === "en" ? "No version" : "暂无版本",
      };

  return (
    <div className="public-shell">
      <PublicHeader
        activeNavigationAnchor="resources"
        descriptor={copy.brandDescriptor}
        languageHrefs={languageHrefs}
        languageLabel={copy.languageLabel}
        locale={locale}
        mobileNavigationLabel={copy.mobileNavigationLabel}
        navigation={copy.nav}
        primaryNavigationLabel={copy.primaryNavigationLabel}
        unavailableLanguages={unavailableLanguages}
        visibleNavigationAnchors={shell.visibleNavigationAnchors}
      />
      <main className="article-page">
        <header>
          <Link href={`/${locale}/resources`}>
            {locale === "en" ? "Technical resources" : "技术资源"}
          </Link>
          <p className="eyebrow">
            {locale === "en" ? "TECHNICAL NOTE" : "技术文章"}
          </p>
          <h1>{article.title}</h1>
          <p className="lede">{article.excerpt}</p>
          <time>
            <CalendarBlank aria-hidden="true" />
            {article.publishedAt.toLocaleDateString(
              locale === "en" ? "en" : "zh-CN",
            )}
          </time>
        </header>
        <RestrictedRichText
          className="article-rich-text restricted-rich-text"
          source={article.body}
        />
        <aside className="core-demo-boundary">
          <Info aria-hidden="true" weight="fill" />
          <p>{copy.demoNotice}</p>
        </aside>
      </main>
      <PublicFooter
        companyName={copy.companyName}
        configuration={shell.configuration}
        contactHeading={copy.footerContact}
        demoNotice={copy.demoNotice}
        description={copy.footerDescription}
        exploreHeading={copy.footerExplore}
        informationHeading={copy.footerInformation}
        locale={locale}
        navigation={copy.nav}
        privacyLabel={copy.footerPrivacy}
        visibleNavigationAnchors={shell.visibleNavigationAnchors}
      />
    </div>
  );
}

import {
  ArrowRight,
  CalendarBlank,
  Info,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { PublicSiteShellData } from "@/src/application/public-site-shell";
import { PublicFooter } from "@/src/components/public/public-footer";
import { PublicHeader } from "@/src/components/public/public-header";
import type { CorePageTranslation } from "@/src/modules/content-publishing/public/core-page-contracts";
import { getHomeCopy } from "@/src/modules/content-publishing/public/home-copy";
import { publicNavigationHref } from "@/src/modules/content-publishing/public/public-navigation";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

type ArticleCard = {
  excerpt: string;
  locale: PublicLocale;
  publishedAt: Date;
  slug: string;
  title: string;
};

export function CoreContentPage({
  activeNavigationAnchor,
  articles = [],
  content,
  locale,
  shell,
}: {
  activeNavigationAnchor: string;
  articles?: ArticleCard[];
  content: CorePageTranslation;
  locale: PublicLocale;
  shell: PublicSiteShellData;
}) {
  const copy = getHomeCopy(locale);
  return (
    <div className="public-shell">
      <PublicHeader
        activeNavigationAnchor={activeNavigationAnchor}
        descriptor={copy.brandDescriptor}
        languageHrefs={{
          en: publicNavigationHref("en", activeNavigationAnchor),
          "zh-cn": publicNavigationHref("zh-cn", activeNavigationAnchor),
        }}
        languageLabel={copy.languageLabel}
        locale={locale}
        mobileNavigationLabel={copy.mobileNavigationLabel}
        navigation={copy.nav}
        primaryNavigationLabel={copy.primaryNavigationLabel}
        visibleNavigationAnchors={shell.visibleNavigationAnchors}
      />
      <main className="core-content-page">
        <header>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className="lede">{content.lede}</p>
        </header>
        <div className="core-content-sections">
          {content.sections.map((section, index) => (
            <section key={section.id}>
              <span>0{index + 1}</span>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
        {articles.length > 0 ? (
          <section
            aria-labelledby="article-index-heading"
            className="article-index"
          >
            <div className="section-heading">
              <p className="eyebrow">{content.eyebrow}</p>
              <h2 id="article-index-heading">
                {locale === "en"
                  ? "Published technical notes"
                  : "已发布技术文章"}
              </h2>
            </div>
            <div>
              {articles.map((article) => (
                <article key={article.slug}>
                  <span className="article-language">
                    {article.locale === "en" ? "English" : "简体中文"}
                  </span>
                  <time>
                    <CalendarBlank aria-hidden="true" />
                    {article.publishedAt.toLocaleDateString(
                      locale === "en" ? "en" : "zh-CN",
                    )}
                  </time>
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  <Link href={`/${locale}/resources/${article.slug}`}>
                    {locale === "en" ? "Read article" : "阅读文章"}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}
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

import {
  ArrowRight,
  Engine,
  Funnel,
  Rows,
  SlidersHorizontal,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

import type { PublicSiteShellData } from "@/src/application/public-site-shell";
import filterFamily from "@/product-ui/public/assets/filter-family.png";
import heroCutaway from "@/product-ui/public/assets/hero-filter-cutaway.png";
import { PublicFooter } from "@/src/components/public/public-footer";
import { PublicHeader } from "@/src/components/public/public-header";
import { ProductFinder } from "@/src/components/public/product-finder";
import { getHomeCopy } from "@/src/modules/content-publishing/public/home-copy";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import type { LocalizedVehicleFitmentOption } from "@/src/modules/catalog/public/fitments";
import type { CorePageTranslation } from "@/src/modules/content-publishing/public/core-page-contracts";

const categoryIcons = [Funnel, Engine, SlidersHorizontal, Rows] as const;

export function HomePage({
  initialFinderMode,
  content,
  locale,
  shell,
  vehicleFitments,
}: {
  content: CorePageTranslation;
  initialFinderMode?: "part" | "specifications" | "vehicle";
  locale: PublicLocale;
  shell: PublicSiteShellData;
  vehicleFitments: LocalizedVehicleFitmentOption[];
}) {
  const copy = getHomeCopy(locale);
  const sections = new Map(
    content.sections.map((section) => [section.id, section]),
  );

  return (
    <div className="public-shell">
      <PublicHeader
        descriptor={copy.brandDescriptor}
        languageLabel={copy.languageLabel}
        locale={locale}
        mobileNavigationLabel={copy.mobileNavigationLabel}
        navigation={copy.nav}
        primaryNavigationLabel={copy.primaryNavigationLabel}
        visibleNavigationAnchors={shell.visibleNavigationAnchors}
      />
      <main>
        <section className="home-hero">
          <div className="home-copy">
            <p className="eyebrow">{content.eyebrow}</p>
            <h1>{content.title}</h1>
            <p className="lede">{content.lede}</p>
            <div className="home-finder-intro">
              <h2>{sections.get("finder_intro")?.heading}</h2>
              <p>{sections.get("finder_intro")?.body}</p>
            </div>
            <ProductFinder
              action={copy.findAction}
              categories={copy.categories.map(({ code, name }) => ({
                code,
                name,
              }))}
              finderLabel={copy.finderLabel}
              helper={copy.helper}
              initialMode={initialFinderMode}
              locale={locale}
              modes={copy.finderModes}
              vehicleFitments={vehicleFitments}
            />
          </div>
          <figure className="hero-visual">
            <Image
              alt={copy.heroImageAlt}
              fill
              priority
              sizes="(max-width: 820px) 100vw, 43vw"
              src={heroCutaway}
            />
          </figure>
        </section>

        <section
          aria-labelledby="category-heading"
          className="category-section"
        >
          <div className="section-heading">
            <p className="eyebrow">{copy.categoryEyebrow}</p>
            <h2 id="category-heading">{copy.categoryHeading}</h2>
          </div>
          <div className="category-index">
            {copy.categories.map((category, index) => {
              const Icon = categoryIcons[index];
              return (
                <Link
                  href={`/${locale}/products?category=${category.code}`}
                  key={category.name}
                >
                  <Icon aria-hidden="true" size={44} weight="thin" />
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.detail}</small>
                  </span>
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="process-band" id="quality">
          <div className="process-heading">
            <p className="eyebrow">{copy.processEyebrow}</p>
            <h2>{sections.get("process")?.heading ?? copy.processHeading}</h2>
            <p>{sections.get("process")?.body}</p>
          </div>
          {copy.process.map((step, index) => (
            <article key={step.title}>
              <span>0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </section>

        <section className="family-band" id="private-label">
          <div className="family-visual">
            <Image
              alt={copy.familyImageAlt}
              fill
              sizes="(max-width: 820px) 100vw, 50vw"
              src={filterFamily}
            />
          </div>
          <div>
            <p className="eyebrow">{copy.categoryEyebrow}</p>
            <h2>
              {sections.get("private_label")?.heading ?? copy.categoryHeading}
            </h2>
            <p>
              {sections.get("private_label")?.body ?? copy.footerDescription}
            </p>
            <Link className="secondary-button" href={`/${locale}/products`}>
              {copy.findAction}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </section>
        <section className="home-resource-band">
          <p className="eyebrow">{copy.nav[3].label}</p>
          <h2>{sections.get("resources")?.heading}</h2>
          <p>{sections.get("resources")?.body}</p>
          <Link className="secondary-button" href={`/${locale}/resources`}>
            {copy.nav[3].label}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </section>
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

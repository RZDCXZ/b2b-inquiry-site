import {
  ArrowRight,
  Engine,
  Funnel,
  Rows,
  SlidersHorizontal,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

import filterFamily from "@/product-ui/public/assets/filter-family.png";
import heroCutaway from "@/product-ui/public/assets/hero-filter-cutaway.png";
import { PublicFooter } from "@/src/components/public/public-footer";
import { PublicHeader } from "@/src/components/public/public-header";
import { ProductFinder } from "@/src/components/public/product-finder";
import { getHomeCopy } from "@/src/modules/content-publishing/public/home-copy";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import type { LocalizedVehicleFitmentOption } from "@/src/modules/catalog/public/fitments";

const categoryIcons = [Funnel, Engine, SlidersHorizontal, Rows] as const;

export function HomePage({
  initialFinderMode,
  locale,
  vehicleFitments,
}: {
  initialFinderMode?: "part" | "specifications" | "vehicle";
  locale: PublicLocale;
  vehicleFitments: LocalizedVehicleFitmentOption[];
}) {
  const copy = getHomeCopy(locale);

  return (
    <div className="public-shell">
      <PublicHeader
        descriptor={copy.brandDescriptor}
        languageLabel={copy.languageLabel}
        locale={locale}
        mobileNavigationLabel={copy.mobileNavigationLabel}
        navigation={copy.nav}
        primaryNavigationLabel={copy.primaryNavigationLabel}
      />
      <main>
        <section className="home-hero">
          <div className="home-copy">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.heading}</h1>
            <p className="lede">{copy.lede}</p>
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
            <h2>{copy.processHeading}</h2>
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
            <h2>{copy.categoryHeading}</h2>
            <p>{copy.footerDescription}</p>
            <Link className="secondary-button" href={`/${locale}/products`}>
              {copy.findAction}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </section>
        <div id="resources" />
        <div id="about" />
      </main>
      <PublicFooter
        companyName={copy.companyName}
        contactHeading={copy.footerContact}
        demoNotice={copy.demoNotice}
        description={copy.footerDescription}
        exploreHeading={copy.footerExplore}
        informationHeading={copy.footerInformation}
        locale={locale}
        navigation={copy.nav}
        privacyLabel={copy.footerPrivacy}
      />
    </div>
  );
}

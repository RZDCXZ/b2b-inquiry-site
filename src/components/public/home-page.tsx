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
import { getHomeCopy } from "@/src/modules/content-publishing/public/home-copy";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

const categoryIcons = [Funnel, Engine, SlidersHorizontal, Rows] as const;

export function HomePage({ locale }: { locale: PublicLocale }) {
  const copy = getHomeCopy(locale);

  return (
    <div className="public-shell">
      <PublicHeader
        descriptor={copy.brandDescriptor}
        languageLabel={copy.languageLabel}
        locale={locale}
        navigation={copy.nav}
      />
      <main>
        <section className="home-hero">
          <div className="home-copy">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.heading}</h1>
            <p className="lede">{copy.lede}</p>
            <div className="search-workbench" id="products">
              <div
                aria-label="Product finder modes"
                className="search-tabs"
                role="tablist"
              >
                {copy.tabs.map((tab, index) => (
                  <button
                    aria-selected={index === 0}
                    key={tab}
                    role="tab"
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <form action={`/${locale}#products`} className="search-panel">
                <label>
                  <span>{copy.searchLabel}</span>
                  <input
                    name="part"
                    placeholder={copy.searchPlaceholder}
                    type="search"
                  />
                </label>
                <button className="primary-button" type="submit">
                  {copy.findAction}
                  <ArrowRight aria-hidden="true" size={18} weight="bold" />
                </button>
                <p>{copy.helper}</p>
              </form>
            </div>
          </div>
          <figure className="hero-visual">
            <Image
              alt={
                locale === "en"
                  ? "Fuel filter cutaway with dimensional and fluid path annotations"
                  : "带尺寸与流体路径标注的燃油滤清器剖面"
              }
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
                <Link href={`/${locale}#products`} key={category.name}>
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
              alt={
                locale === "en"
                  ? "Four commercial vehicle filter categories"
                  : "四类商用车滤清产品"
              }
              fill
              sizes="(max-width: 820px) 100vw, 50vw"
              src={filterFamily}
            />
          </div>
          <div>
            <p className="eyebrow">{copy.categoryEyebrow}</p>
            <h2>{copy.categoryHeading}</h2>
            <p>{copy.footerDescription}</p>
            <Link className="secondary-button" href={`/${locale}#products`}>
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

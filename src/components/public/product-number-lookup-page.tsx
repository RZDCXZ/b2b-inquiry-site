import {
  ArrowRight,
  Info,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";

import filterFamily from "@/product-ui/public/assets/filter-family.png";
import fuelFilter from "@/product-ui/public/assets/fuel-filter-product.png";
import type { ProductNumberLookupResult } from "@/src/application/public-catalog";
import { PublicFooter } from "@/src/components/public/public-footer";
import { PublicHeader } from "@/src/components/public/public-header";
import { getCatalogCopy } from "@/src/modules/content-publishing/public/catalog-copy";
import { getHomeCopy } from "@/src/modules/content-publishing/public/home-copy";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

const productImages: Record<string, StaticImageData> = {
  "/assets/filter-family.png": filterFamily,
  "/assets/fuel-filter-product.png": fuelFilter,
};

type DisplayedProductNumberLookup = Exclude<
  ProductNumberLookupResult,
  { kind: "product-number" }
>;

export function ProductNumberLookupPage({
  locale,
  lookup,
}: {
  locale: PublicLocale;
  lookup: DisplayedProductNumberLookup;
}) {
  const catalogCopy = getCatalogCopy(locale);
  const homeCopy = getHomeCopy(locale);
  const matches = lookup.kind === "reference-number" ? lookup.matches : [];
  const languageQuery = new URLSearchParams({ part: lookup.number }).toString();

  return (
    <div className="public-shell">
      <PublicHeader
        activeNavigationAnchor="products"
        descriptor={homeCopy.brandDescriptor}
        languageHrefs={{
          en: `/en/products?${languageQuery}`,
          "zh-cn": `/zh-cn/products?${languageQuery}`,
        }}
        languageLabel={homeCopy.languageLabel}
        locale={locale}
        mobileNavigationLabel={homeCopy.mobileNavigationLabel}
        navigation={homeCopy.nav}
        primaryNavigationLabel={homeCopy.primaryNavigationLabel}
      />
      <main className="catalog-page product-number-lookup-page">
        <section className="catalog-heading lookup-heading">
          <div>
            <p className="eyebrow">{catalogCopy.lookupEyebrow}</p>
            <h1>
              {lookup.kind === "reference-number"
                ? catalogCopy.lookupMatchCount(matches.length)
                : catalogCopy.lookupNoResultHeading}
            </h1>
          </div>
          <p>
            {lookup.kind === "reference-number"
              ? catalogCopy.lookupMatchExplanation
              : catalogCopy.lookupNoResultLede}
          </p>
        </section>

        <form
          action={`/${locale}/products`}
          className="lookup-search-form"
          method="get"
        >
          <label>
            <span>{catalogCopy.lookupInputLabel}</span>
            <input defaultValue={lookup.number} name="part" type="search" />
          </label>
          <button className="primary-button" type="submit">
            {catalogCopy.lookupAction}
            <ArrowRight aria-hidden="true" size={18} weight="bold" />
          </button>
        </form>

        <section aria-live="polite" className="lookup-results">
          {lookup.kind === "reference-number" ? (
            <div className="reference-match-grid">
              <header className="lookup-result-context">
                <strong>{catalogCopy.lookupCrossReferenceResult}</strong>
                <span>{catalogCopy.lookupCurrentUnit}</span>
              </header>
              {matches.map(({ product, references }, index) => (
                <article className="reference-match-card" key={product.id}>
                  <figure>
                    <Image
                      alt={`${product.name} ${product.partNumber}`}
                      fill
                      loading={index < 2 ? "eager" : "lazy"}
                      sizes="(max-width: 820px) 100vw, 36vw"
                      src={productImages[product.imagePath] ?? filterFamily}
                      unoptimized
                    />
                  </figure>
                  <div>
                    <p className="eyebrow">
                      {catalogCopy.lookupCrossReferenceResult}
                    </p>
                    <h2>{product.partNumber}</h2>
                    <h3>{product.name}</h3>
                    <p className="reference-match-summary">{product.summary}</p>
                    <dl className="reference-identity-list">
                      {references.map((reference) => (
                        <div
                          key={`${reference.brand}-${reference.referenceNumber}`}
                        >
                          <dt>{catalogCopy.lookupReferenceBrand}</dt>
                          <dd>{reference.brand}</dd>
                          <dt>{catalogCopy.lookupReferenceNumber}</dt>
                          <dd>
                            <code>{reference.referenceNumber}</code>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <section className="reference-key-specifications">
                      <h4>{catalogCopy.lookupKeySpecifications}</h4>
                      <dl>
                        {product.keySpecifications.map((specification) => (
                          <div key={specification.code}>
                            <dt>{specification.label}</dt>
                            <dd>
                              {specification.value} {specification.unit}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                    <aside className="reference-disclaimer">
                      <Info aria-hidden="true" size={18} weight="fill" />
                      {catalogCopy.lookupReferenceDisclaimer}
                    </aside>
                    <Link className="primary-button" href={product.href}>
                      {catalogCopy.viewProduct}
                      <ArrowRight aria-hidden="true" size={18} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="lookup-empty-state">
              <MagnifyingGlass aria-hidden="true" size={48} weight="thin" />
              <strong>{lookup.number}</strong>
              <p>{catalogCopy.lookupNoResultLede}</p>
              <div>
                <Link className="secondary-button" href={`/${locale}/products`}>
                  {catalogCopy.lookupClearNumber}
                </Link>
                <Link
                  className="secondary-button"
                  href={`/${locale}/products#categories`}
                >
                  {catalogCopy.lookupBrowseCategories}
                </Link>
                <Link
                  className="secondary-button"
                  href={`/${locale}?finder=vehicle#products`}
                >
                  {catalogCopy.lookupSearchByVehicle}
                </Link>
                <a
                  className="primary-button"
                  href="mailto:inquiries@torquelis.example?subject=General%20inquiry"
                >
                  {catalogCopy.lookupGeneralInquiry}
                </a>
              </div>
            </div>
          )}
        </section>
      </main>
      <PublicFooter
        companyName={homeCopy.companyName}
        contactHeading={homeCopy.footerContact}
        demoNotice={homeCopy.demoNotice}
        description={homeCopy.footerDescription}
        exploreHeading={homeCopy.footerExplore}
        informationHeading={homeCopy.footerInformation}
        locale={locale}
        navigation={homeCopy.nav}
        privacyLabel={homeCopy.footerPrivacy}
      />
    </div>
  );
}

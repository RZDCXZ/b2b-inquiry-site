import {
  ArrowLeft,
  ArrowRight,
  Info,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";

import filterFamily from "@/product-ui/public/assets/filter-family.png";
import fuelFilter from "@/product-ui/public/assets/fuel-filter-product.png";
import type { PublishedProductDetail } from "@/src/application/public-catalog";
import { PublicFooter } from "@/src/components/public/public-footer";
import { PublicHeader } from "@/src/components/public/public-header";
import { getCatalogCopy } from "@/src/modules/content-publishing/public/catalog-copy";
import { getHomeCopy } from "@/src/modules/content-publishing/public/home-copy";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

const productImages: Record<string, StaticImageData> = {
  "/assets/filter-family.png": filterFamily,
  "/assets/fuel-filter-product.png": fuelFilter,
};

export function ProductDetailPage({
  locale,
  product,
}: {
  locale: PublicLocale;
  product: PublishedProductDetail;
}) {
  const catalogCopy = getCatalogCopy(locale);
  const homeCopy = getHomeCopy(locale);

  return (
    <div className="public-shell">
      <PublicHeader
        activeNavigationAnchor="products"
        descriptor={homeCopy.brandDescriptor}
        languageHrefs={product.languageHrefs}
        languageLabel={homeCopy.languageLabel}
        locale={locale}
        mobileNavigationLabel={homeCopy.mobileNavigationLabel}
        navigation={homeCopy.nav}
        primaryNavigationLabel={homeCopy.primaryNavigationLabel}
      />
      <main className="product-detail-page">
        <nav aria-label="Breadcrumb" className="product-breadcrumbs">
          <Link href={`/${locale}/products`}>
            <ArrowLeft aria-hidden="true" size={16} />
            {catalogCopy.detailBack}
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${locale}/products?category=${product.category.code}`}>
            {product.category.name}
          </Link>
        </nav>

        {product.status === "discontinued" ? (
          <aside className="product-discontinued-banner">
            <Warning aria-hidden="true" size={22} weight="fill" />
            <div>
              <strong>{catalogCopy.discontinuedHeading}</strong>
              <p>{catalogCopy.discontinuedHistory}</p>
              <p>
                {product.replacement ? (
                  <>
                    {catalogCopy.discontinuedReplacementLabel}{" "}
                    <Link href={product.replacement.href}>
                      {product.replacement.partNumber} —{" "}
                      {product.replacement.name}
                    </Link>
                  </>
                ) : (
                  catalogCopy.discontinuedNoReplacement
                )}
              </p>
            </div>
          </aside>
        ) : null}

        <section className="product-detail-hero">
          <figure>
            <Image
              alt={`${product.name} ${product.partNumber}`}
              fill
              priority
              sizes="(max-width: 820px) 100vw, 50vw"
              src={productImages[product.imagePath] ?? filterFamily}
            />
            <span>{product.category.name}</span>
          </figure>
          <div className="product-detail-summary">
            <div className="product-detail-status">
              <p className="eyebrow">{catalogCopy.detailEyebrow}</p>
              <span data-status={product.status}>
                {product.status === "discontinued"
                  ? catalogCopy.detailDiscontinued
                  : catalogCopy.detailPublished}
              </span>
            </div>
            <h1>{product.partNumber}</h1>
            <h2>{product.name}</h2>
            <p>{product.summary}</p>
            <nav
              aria-label={catalogCopy.unitSystemLabel}
              className="specification-unit-toggle"
            >
              <Link
                aria-current={
                  product.unitSystem === "metric" ? "page" : undefined
                }
                href={product.href}
              >
                {catalogCopy.unitSystems.metric}
              </Link>
              <Link
                aria-current={
                  product.unitSystem === "imperial" ? "page" : undefined
                }
                href={`${product.href}?unit=imperial`}
              >
                {catalogCopy.unitSystems.imperial}
              </Link>
            </nav>
            <section aria-labelledby="key-specifications-heading">
              <h3 id="key-specifications-heading">
                {catalogCopy.keySpecificationsHeading}
              </h3>
              <dl>
                {product.specifications
                  .filter(({ unit }) => unit !== null)
                  .slice(0, 4)
                  .map((specification) => (
                    <div key={specification.code}>
                      <dt>{specification.label}</dt>
                      <dd>
                        {specification.value} {specification.unit}
                        {specification.converted ? (
                          <small>{catalogCopy.convertedLabel}</small>
                        ) : null}
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>
            <aside className="catalog-demo-note">
              <Info aria-hidden="true" size={19} weight="fill" />
              {catalogCopy.demoDataNotice}
            </aside>
            <Link className="primary-button" href={`/${locale}#contact`}>
              {catalogCopy.detailInquiry}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </section>
        <section
          aria-labelledby="product-specifications-heading"
          className="product-specifications"
        >
          <header>
            <div>
              <p className="eyebrow">{product.category.name}</p>
              <h2 id="product-specifications-heading">
                {catalogCopy.specificationsHeading}
              </h2>
              <p>{catalogCopy.metricBaseline}</p>
            </div>
          </header>
          <div className="specification-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{catalogCopy.specificationColumn}</th>
                  <th scope="col">{catalogCopy.valueColumn}</th>
                </tr>
              </thead>
              <tbody>
                {product.specifications.map((specification) => (
                  <tr key={specification.code}>
                    <th scope="row">{specification.label}</th>
                    <td>
                      <span>{specification.value}</span>
                      {specification.unit ? ` ${specification.unit}` : ""}
                      {specification.converted ? (
                        <small>{catalogCopy.convertedLabel}</small>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="catalog-demo-note">
            <Info aria-hidden="true" size={19} weight="fill" />
            {catalogCopy.demoDataNotice}
          </aside>
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

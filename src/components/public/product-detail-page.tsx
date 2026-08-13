import { ArrowLeft, ArrowRight, Info } from "@phosphor-icons/react/dist/ssr";
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
              <span>{catalogCopy.detailPublished}</span>
            </div>
            <h1>{product.partNumber}</h1>
            <h2>{product.name}</h2>
            <p>{product.summary}</p>
            <section aria-labelledby="product-summary-heading">
              <h3 id="product-summary-heading">
                {catalogCopy.detailSummaryHeading}
              </h3>
              <dl>
                <div>
                  <dt>{product.category.name}</dt>
                  <dd>{catalogCopy.detailPublished}</dd>
                </div>
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

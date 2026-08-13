import { ArrowRight, Info } from "@phosphor-icons/react/dist/ssr";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";

import filterFamily from "@/product-ui/public/assets/filter-family.png";
import fuelFilter from "@/product-ui/public/assets/fuel-filter-product.png";
import type {
  LocalizedProductCategory,
  PublishedCatalogProduct,
} from "@/src/application/public-catalog";
import { PublicFooter } from "@/src/components/public/public-footer";
import { PublicHeader } from "@/src/components/public/public-header";
import { getCatalogCopy } from "@/src/modules/content-publishing/public/catalog-copy";
import { getHomeCopy } from "@/src/modules/content-publishing/public/home-copy";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import {
  findSelectedVehicleFitment,
  type LocalizedVehicleFitmentOption,
} from "@/src/modules/catalog/public/fitments";
import { ProductFinder } from "@/src/components/public/product-finder";
import type { VehicleFinderSelection } from "@/src/components/public/vehicle-finder";

const productImages: Record<string, StaticImageData> = {
  "/assets/filter-family.png": filterFamily,
  "/assets/fuel-filter-product.png": fuelFilter,
};

type CatalogPageProps = {
  categories: LocalizedProductCategory[];
  initialFinderMode?: "part" | "specifications" | "vehicle";
  initialVehicleSelection?: VehicleFinderSelection;
  locale: PublicLocale;
  products: PublishedCatalogProduct[];
  selectedCategory?: LocalizedProductCategory;
  vehicleFitments: LocalizedVehicleFitmentOption[];
  vehicleQueryString?: string;
};

export function CatalogPage({
  categories,
  initialFinderMode,
  initialVehicleSelection,
  locale,
  products,
  selectedCategory,
  vehicleFitments,
  vehicleQueryString,
}: CatalogPageProps) {
  const catalogCopy = getCatalogCopy(locale);
  const homeCopy = getHomeCopy(locale);
  const categoryQuery = selectedCategory
    ? `?category=${selectedCategory.code}`
    : "";
  const languageQuery = vehicleQueryString
    ? `?${vehicleQueryString}`
    : categoryQuery;
  const selectedFitment = initialVehicleSelection
    ? findSelectedVehicleFitment(vehicleFitments, initialVehicleSelection)
    : undefined;

  return (
    <div className="public-shell">
      <PublicHeader
        activeNavigationAnchor="products"
        descriptor={homeCopy.brandDescriptor}
        languageHrefs={{
          en: `/en/products${languageQuery}`,
          "zh-cn": `/zh-cn/products${languageQuery}`,
        }}
        languageLabel={homeCopy.languageLabel}
        locale={locale}
        mobileNavigationLabel={homeCopy.mobileNavigationLabel}
        navigation={homeCopy.nav}
        primaryNavigationLabel={homeCopy.primaryNavigationLabel}
      />
      <main className="catalog-page">
        <section className="catalog-heading">
          <div>
            <p className="eyebrow">{catalogCopy.catalogueEyebrow}</p>
            <h1>{selectedCategory?.name ?? catalogCopy.catalogueHeading}</h1>
          </div>
          <p>{catalogCopy.catalogueLede}</p>
        </section>

        <nav
          aria-label={catalogCopy.catalogueHeading}
          className="category-nav"
          id="categories"
        >
          <Link
            aria-current={!selectedCategory ? "page" : undefined}
            href={`/${locale}/products`}
          >
            {catalogCopy.allCategories}
          </Link>
          {categories.map((category) => (
            <Link
              aria-current={
                selectedCategory?.code === category.code ? "page" : undefined
              }
              href={`/${locale}/products?category=${category.code}`}
              key={category.code}
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <div className="catalog-discovery-layout">
          <section className="catalog-finder" aria-label={homeCopy.finderLabel}>
            <ProductFinder
              action={homeCopy.findAction}
              finderLabel={homeCopy.finderLabel}
              helper={homeCopy.helper}
              initialMode={initialFinderMode}
              initialVehicleSelection={initialVehicleSelection}
              locale={locale}
              modes={homeCopy.finderModes}
              vehicleFitments={vehicleFitments}
            />
          </section>

          <section aria-live="polite" className="catalog-results">
            {selectedFitment && initialVehicleSelection?.year ? (
              <aside className="vehicle-result-context">
                <strong>
                  {selectedFitment.make.name} {selectedFitment.model.name}
                </strong>
                <span>
                  {initialVehicleSelection.year} · {selectedFitment.engine.code}
                </span>
              </aside>
            ) : null}
            <header>
              <div>
                <span>
                  {initialFinderMode === "vehicle"
                    ? catalogCopy.resultVehicleType
                    : catalogCopy.resultCatalogueType}
                </span>
                <strong>{catalogCopy.productCount(products.length)}</strong>
              </div>
              <div>
                <span>{catalogCopy.resultCurrentUnit}</span>
                <span>{catalogCopy.sortedLabel}</span>
              </div>
            </header>
            {products.length > 0 ? (
              <div className="catalog-grid">
                {products.map((product, index) => (
                  <Link
                    aria-label={`${catalogCopy.viewProduct}: ${product.partNumber} — ${product.name}`}
                    className="catalog-card"
                    href={product.href}
                    key={product.id}
                  >
                    <article>
                      <figure>
                        <Image
                          alt={`${product.name} ${product.partNumber}`}
                          fill
                          loading={index === 0 ? "eager" : "lazy"}
                          sizes="(max-width: 820px) 100vw, 30vw"
                          src={productImages[product.imagePath] ?? filterFamily}
                        />
                      </figure>
                      <div>
                        <p>{product.category.name}</p>
                        <strong>{product.partNumber}</strong>
                        <h2>{product.name}</h2>
                        <span>{product.summary}</span>
                        <small>
                          {catalogCopy.viewProduct}
                          <ArrowRight aria-hidden="true" size={17} />
                        </small>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="catalog-empty-state">
                <h2>{catalogCopy.resultNoMatchesHeading}</h2>
                <p>{catalogCopy.resultNoMatchesLede}</p>
                <div>
                  <Link
                    className="secondary-button"
                    href={`/${locale}/products`}
                  >
                    {catalogCopy.resultClearFilters}
                  </Link>
                  <Link
                    className="secondary-button"
                    href={`/${locale}?finder=part#products`}
                  >
                    {catalogCopy.resultSearchByNumber}
                  </Link>
                  <a
                    className="secondary-button"
                    href="mailto:inquiries@torquelis.example?subject=General%20inquiry"
                  >
                    {catalogCopy.resultGeneralInquiry}
                  </a>
                </div>
              </div>
            )}
            <aside className="catalog-demo-note">
              <Info aria-hidden="true" size={19} weight="fill" />
              {catalogCopy.demoDataNotice}
            </aside>
          </section>
        </div>
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

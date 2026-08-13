import { ArrowRight, Info } from "@phosphor-icons/react/dist/ssr";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";

import filterFamily from "@/product-ui/public/assets/filter-family.png";
import fuelFilter from "@/product-ui/public/assets/fuel-filter-product.png";
import type {
  LocalizedProductCategory,
  PublishedCatalogProduct,
  SpecificationSearchProduct,
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
import type {
  LocalizedSpecificationFilterDefinition,
  SpecificationFilter,
  SpecificationFilterIssue,
} from "@/src/modules/catalog/public/specification-filters";
import {
  convertSpecificationUnit,
  getSpecificationUnitForSystem,
  getSpecificationUnitLabel,
  type UnitSystem,
} from "@/src/modules/catalog/public/specifications";

const productImages: Record<string, StaticImageData> = {
  "/assets/filter-family.png": filterFamily,
  "/assets/fuel-filter-product.png": fuelFilter,
};

type CatalogPageProps = {
  categories: LocalizedProductCategory[];
  filterDefinitions?: LocalizedSpecificationFilterDefinition[];
  filters?: SpecificationFilter[];
  initialFinderMode?: "part" | "specifications" | "vehicle";
  initialVehicleSelection?: VehicleFinderSelection;
  locale: PublicLocale;
  page?: number;
  pageCount?: number;
  products: Array<PublishedCatalogProduct | SpecificationSearchProduct>;
  resultTotal?: number;
  selectedCategory?: LocalizedProductCategory;
  vehicleFitments: LocalizedVehicleFitmentOption[];
  vehicleQueryString?: string;
  specificationIssues?: SpecificationFilterIssue[];
  specificationQueryString?: string;
  unitSystem?: UnitSystem;
};

export function CatalogPage({
  categories,
  filterDefinitions = [],
  filters = [],
  initialFinderMode,
  initialVehicleSelection,
  locale,
  page = 1,
  pageCount = 1,
  products,
  resultTotal,
  selectedCategory,
  vehicleFitments,
  vehicleQueryString,
  specificationIssues = [],
  specificationQueryString,
  unitSystem = "metric",
}: CatalogPageProps) {
  const catalogCopy = getCatalogCopy(locale);
  const homeCopy = getHomeCopy(locale);
  const categoryQuery = selectedCategory
    ? `?category=${selectedCategory.code}`
    : "";
  const languageQuery = specificationQueryString
    ? `?${specificationQueryString}`
    : vehicleQueryString
      ? `?${vehicleQueryString}`
      : categoryQuery;
  const selectedFitment = initialVehicleSelection
    ? findSelectedVehicleFitment(vehicleFitments, initialVehicleSelection)
    : undefined;
  const unitLabel = catalogCopy.unitSystems[unitSystem];
  const definitionByCode = new Map(
    filterDefinitions.map((definition) => [definition.code, definition]),
  );
  const activeFilterSummaries = filters.flatMap((filter) => {
    const definition = definitionByCode.get(filter.attributeCode);

    if (!definition) {
      return [];
    }

    if (filter.kind === "decimal-range" && definition.baseUnit) {
      const displayUnit = getSpecificationUnitForSystem(
        definition.baseUnit,
        unitSystem,
      );
      const displayValue = (value: number) =>
        displayUnit === definition.baseUnit
          ? value
          : convertSpecificationUnit({
              from: definition.baseUnit!,
              to: displayUnit,
              value,
            });
      const range = [
        filter.minimum === undefined ? "–" : displayValue(filter.minimum),
        filter.maximum === undefined ? "–" : displayValue(filter.maximum),
      ].join(" – ");

      return [
        {
          code: filter.attributeCode,
          label: `${definition.label}: ${range} ${getSpecificationUnitLabel(displayUnit)}`,
        },
      ];
    }

    const value =
      filter.kind === "enumeration"
        ? definition.options.find((option) => option.value === filter.value)
            ?.label
        : filter.kind === "boolean"
          ? filter.value
            ? catalogCopy.filterYes
            : catalogCopy.filterNo
          : undefined;

    return value
      ? [{ code: filter.attributeCode, label: `${definition.label}: ${value}` }]
      : [];
  });
  const queryForPage = (nextPage: number) => {
    const params = new URLSearchParams(specificationQueryString);
    params.set("page", String(nextPage));
    return `/${locale}/products?${params.toString()}`;
  };
  const queryWithoutFilter = (attributeCode: string) => {
    const params = new URLSearchParams(specificationQueryString);
    params.delete(`spec.${attributeCode}`);
    params.delete(`spec.${attributeCode}.min`);
    params.delete(`spec.${attributeCode}.max`);
    params.set("page", "1");
    return `/${locale}/products?${params.toString()}`;
  };
  const clearFiltersHref =
    initialFinderMode === "specifications" && selectedCategory
      ? `/${locale}/products?${new URLSearchParams({
          finder: "specifications",
          category: selectedCategory.code,
          unit: unitSystem,
          page: "1",
        }).toString()}`
      : `/${locale}/products`;

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
              categories={categories}
              categoryCode={selectedCategory?.code}
              filterDefinitions={filterDefinitions}
              filters={filters}
              finderLabel={homeCopy.finderLabel}
              helper={homeCopy.helper}
              initialMode={initialFinderMode}
              initialVehicleSelection={initialVehicleSelection}
              locale={locale}
              modes={homeCopy.finderModes}
              unitSystem={unitSystem}
              vehicleFitments={vehicleFitments}
            />
          </section>

          <section aria-live="polite" className="catalog-results">
            {specificationIssues.length > 0 ? (
              <aside className="specification-filter-feedback" role="status">
                <Info aria-hidden="true" size={20} weight="fill" />
                <div>
                  <strong>{catalogCopy.filterIssuesHeading}</strong>
                  <ul>
                    {specificationIssues.map((issue, index) => (
                      <li key={`${issue.code}:${issue.parameter}:${index}`}>
                        {catalogCopy.filterIssues[issue.code]}
                        {issue.parameter ? (
                          <code>{issue.parameter}</code>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            ) : null}
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
                    : initialFinderMode === "specifications"
                      ? catalogCopy.resultSpecificationType
                      : catalogCopy.resultCatalogueType}
                </span>
                <strong>
                  {catalogCopy.productCount(resultTotal ?? products.length)}
                </strong>
              </div>
              <div>
                <span>{catalogCopy.resultCurrentUnitFor(unitLabel)}</span>
                <span>{catalogCopy.sortedLabel}</span>
              </div>
            </header>
            {activeFilterSummaries.length > 0 ? (
              <div className="active-specification-filters">
                {activeFilterSummaries.map((filter) => (
                  <Link
                    href={queryWithoutFilter(filter.code)}
                    key={filter.code}
                  >
                    {filter.label}
                    <span aria-hidden="true">×</span>
                  </Link>
                ))}
              </div>
            ) : null}
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
                          unoptimized
                        />
                      </figure>
                      <div>
                        <p>{product.category.name}</p>
                        <strong>{product.partNumber}</strong>
                        <h2>{product.name}</h2>
                        <span>{product.summary}</span>
                        {"keySpecifications" in product &&
                        product.keySpecifications.length > 0 ? (
                          <dl className="catalog-card-specifications">
                            {product.keySpecifications.map((specification) => (
                              <div key={specification.code}>
                                <span>
                                  {specification.label} {specification.value}
                                  {specification.unit
                                    ? ` ${specification.unit}`
                                    : ""}
                                </span>
                                {specification.converted ? (
                                  <small>{catalogCopy.convertedLabel}</small>
                                ) : null}
                              </div>
                            ))}
                          </dl>
                        ) : null}
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
                  <Link className="secondary-button" href={clearFiltersHref}>
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
            {specificationQueryString && pageCount > 1 ? (
              <nav
                aria-label={catalogCopy.paginationLabel}
                className="catalog-pagination"
              >
                {page > 1 ? (
                  <Link href={queryForPage(page - 1)}>
                    {catalogCopy.paginationPrevious}
                  </Link>
                ) : (
                  <span aria-disabled="true">
                    {catalogCopy.paginationPrevious}
                  </span>
                )}
                <strong>{catalogCopy.paginationStatus(page, pageCount)}</strong>
                {page < pageCount ? (
                  <Link href={queryForPage(page + 1)}>
                    {catalogCopy.paginationNext}
                  </Link>
                ) : (
                  <span aria-disabled="true">{catalogCopy.paginationNext}</span>
                )}
              </nav>
            ) : null}
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

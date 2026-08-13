"use client";

import { CaretDown, SlidersHorizontal, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import {
  createEmptySpecificationFilterSearchParams,
  type LocalizedSpecificationFilterDefinition,
  type SpecificationFilter,
  withSpecificationFilterUnit,
} from "@/src/modules/catalog/public/specification-filters";
import {
  convertSpecificationUnit,
  getSpecificationUnitForSystem,
  getSpecificationUnitLabel,
  type MetricSpecificationUnit,
  type UnitSystem,
} from "@/src/modules/catalog/public/specifications";
import {
  PRODUCT_CATEGORY_CODE_SCHEMA,
  type LocalizedProductCategory,
} from "@/src/modules/catalog/public/product-identity";
import { getCatalogCopy } from "@/src/modules/content-publishing/public/catalog-copy";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

function decimalFilterValue(
  filters: SpecificationFilter[],
  attributeCode: string,
  boundary: "maximum" | "minimum",
): number | undefined {
  const filter = filters.find(
    (candidate) =>
      candidate.kind === "decimal-range" &&
      candidate.attributeCode === attributeCode,
  );

  return filter?.kind === "decimal-range" ? filter[boundary] : undefined;
}

function displayDecimalValue(
  metricValue: number | undefined,
  baseUnit: MetricSpecificationUnit,
  unitSystem: UnitSystem,
): string {
  if (metricValue === undefined) {
    return "";
  }

  const displayUnit = getSpecificationUnitForSystem(baseUnit, unitSystem);
  return String(
    displayUnit === baseUnit
      ? metricValue
      : convertSpecificationUnit({
          from: baseUnit,
          to: displayUnit,
          value: metricValue,
        }),
  );
}

function metricDecimalValue(
  displayValue: string,
  baseUnit: MetricSpecificationUnit,
  unitSystem: UnitSystem,
): string {
  const number = Number(displayValue);

  if (displayValue.trim() === "" || !Number.isFinite(number)) {
    return displayValue;
  }

  const displayUnit = getSpecificationUnitForSystem(baseUnit, unitSystem);
  return String(
    displayUnit === baseUnit
      ? number
      : convertSpecificationUnit({
          from: displayUnit,
          to: baseUnit,
          value: number,
        }),
  );
}

function DecimalRangeField({
  definition,
  filters,
  locale,
  unitSystem,
}: {
  definition: LocalizedSpecificationFilterDefinition & {
    baseUnit: MetricSpecificationUnit;
  };
  filters: SpecificationFilter[];
  locale: PublicLocale;
  unitSystem: UnitSystem;
}) {
  const copy = getCatalogCopy(locale);
  const initialMinimum = decimalFilterValue(
    filters,
    definition.code,
    "minimum",
  );
  const initialMaximum = decimalFilterValue(
    filters,
    definition.code,
    "maximum",
  );
  const [minimumDisplay, setMinimumDisplay] = useState(() =>
    displayDecimalValue(initialMinimum, definition.baseUnit, unitSystem),
  );
  const [maximumDisplay, setMaximumDisplay] = useState(() =>
    displayDecimalValue(initialMaximum, definition.baseUnit, unitSystem),
  );
  const [minimumMetric, setMinimumMetric] = useState(
    initialMinimum === undefined ? "" : String(initialMinimum),
  );
  const [maximumMetric, setMaximumMetric] = useState(
    initialMaximum === undefined ? "" : String(initialMaximum),
  );
  const displayUnit = getSpecificationUnitForSystem(
    definition.baseUnit,
    unitSystem,
  );
  const unitLabel = getSpecificationUnitLabel(displayUnit);
  const minimumLabel = copy.filterMinimumLabel(definition.label);
  const maximumLabel = copy.filterMaximumLabel(definition.label);

  return (
    <fieldset className="specification-range-field">
      <legend>{definition.label}</legend>
      <label>
        <span>
          {locale === "en" ? "Minimum" : "最小值"} <small>{unitLabel}</small>
        </span>
        <input
          aria-label={minimumLabel}
          inputMode="decimal"
          max={
            definition.maximumDecimalValue === null
              ? undefined
              : displayDecimalValue(
                  definition.maximumDecimalValue,
                  definition.baseUnit,
                  unitSystem,
                )
          }
          min={
            definition.minimumDecimalValue === null
              ? undefined
              : displayDecimalValue(
                  definition.minimumDecimalValue,
                  definition.baseUnit,
                  unitSystem,
                )
          }
          onChange={(event) => {
            setMinimumDisplay(event.target.value);
            setMinimumMetric(
              metricDecimalValue(
                event.target.value,
                definition.baseUnit,
                unitSystem,
              ),
            );
          }}
          step="any"
          type="number"
          value={minimumDisplay}
        />
      </label>
      {minimumMetric !== "" ? (
        <input
          name={`spec.${definition.code}.min`}
          type="hidden"
          value={minimumMetric}
        />
      ) : null}
      <label>
        <span>
          {locale === "en" ? "Maximum" : "最大值"} <small>{unitLabel}</small>
        </span>
        <input
          aria-label={maximumLabel}
          inputMode="decimal"
          max={
            definition.maximumDecimalValue === null
              ? undefined
              : displayDecimalValue(
                  definition.maximumDecimalValue,
                  definition.baseUnit,
                  unitSystem,
                )
          }
          min={
            definition.minimumDecimalValue === null
              ? undefined
              : displayDecimalValue(
                  definition.minimumDecimalValue,
                  definition.baseUnit,
                  unitSystem,
                )
          }
          onChange={(event) => {
            setMaximumDisplay(event.target.value);
            setMaximumMetric(
              metricDecimalValue(
                event.target.value,
                definition.baseUnit,
                unitSystem,
              ),
            );
          }}
          step="any"
          type="number"
          value={maximumDisplay}
        />
      </label>
      {maximumMetric !== "" ? (
        <input
          name={`spec.${definition.code}.max`}
          type="hidden"
          value={maximumMetric}
        />
      ) : null}
    </fieldset>
  );
}

function SpecificationChoiceField({
  emptyLabel,
  initialValue,
  label,
  name,
  options,
}: {
  emptyLabel: string;
  initialValue: string;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <label className="specification-select-field">
      <span>{label}</span>
      <span className="select-wrap">
        <select
          onChange={(event) => setValue(event.target.value)}
          value={value}
        >
          <option value="">{emptyLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <CaretDown aria-hidden="true" size={17} weight="bold" />
      </span>
      {value ? <input name={name} type="hidden" value={value} /> : null}
    </label>
  );
}

export function SpecificationFinder({
  categories,
  categoryCode,
  definitions,
  filters,
  locale,
  unitSystem,
}: {
  categories: LocalizedProductCategory[];
  categoryCode?: string;
  definitions: LocalizedSpecificationFilterDefinition[];
  filters: SpecificationFilter[];
  locale: PublicLocale;
  unitSystem: UnitSystem;
}) {
  const copy = getCatalogCopy(locale);
  const router = useRouter();
  const catalogPath = `/${locale}/products`;
  const categoryId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const selectedValueByCode = new Map(
    filters.flatMap((filter) =>
      filter.kind === "decimal-range"
        ? []
        : ([[filter.attributeCode, String(filter.value)]] as const),
    ),
  );

  function changeCategory(nextCategoryCode: string) {
    const parsedCategory =
      PRODUCT_CATEGORY_CODE_SCHEMA.safeParse(nextCategoryCode);

    if (!parsedCategory.success) {
      return;
    }

    const params = createEmptySpecificationFilterSearchParams({
      category: parsedCategory.data,
      unitSystem,
    });
    router.push(`${catalogPath}?${params.toString()}`);
  }

  function changeUnit(nextUnitSystem: UnitSystem) {
    const params = withSpecificationFilterUnit(
      window.location.search,
      nextUnitSystem,
    );
    router.push(`${catalogPath}?${params.toString()}`, { scroll: false });
  }

  const form = (
    <form action={`/${locale}/products`} className="specification-filter-form">
      <input name="finder" type="hidden" value="specifications" />
      <input name="unit" type="hidden" value={unitSystem} />
      <input name="page" type="hidden" value="1" />
      <div className="specification-filter-heading">
        <div>
          <strong>{copy.resultSpecificationType}</strong>
          <span>{copy.filterUnitHelper}</span>
        </div>
        <button
          aria-label={copy.filterClose}
          className="specification-filter-close"
          onClick={() => setMobileOpen(false)}
          type="button"
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>
      <label className="specification-select-field" htmlFor={categoryId}>
        <span>{copy.filterCategoryLabel}</span>
        <span className="select-wrap">
          <select
            id={categoryId}
            name="category"
            onChange={(event) => changeCategory(event.target.value)}
            value={categoryCode ?? ""}
          >
            <option value="">{copy.filterChooseCategory}</option>
            {categories.map((category) => (
              <option key={category.code} value={category.code}>
                {category.name}
              </option>
            ))}
          </select>
          <CaretDown aria-hidden="true" size={17} weight="bold" />
        </span>
      </label>
      {categoryCode ? (
        <>
          <fieldset className="specification-unit-field">
            <legend>{copy.unitSystemLabel}</legend>
            <div>
              {(["metric", "imperial"] as const).map((system) => (
                <button
                  aria-pressed={unitSystem === system}
                  key={system}
                  onClick={() => changeUnit(system)}
                  type="button"
                >
                  {copy.unitSystems[system]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="specification-filter-fields">
            {definitions.map((definition) => {
              if (definition.dataType === "decimal" && definition.baseUnit) {
                return (
                  <DecimalRangeField
                    definition={{
                      ...definition,
                      baseUnit: definition.baseUnit,
                    }}
                    filters={filters}
                    key={`${definition.code}:${unitSystem}`}
                    locale={locale}
                    unitSystem={unitSystem}
                  />
                );
              }

              if (definition.dataType === "enumeration") {
                return (
                  <SpecificationChoiceField
                    emptyLabel={copy.filterAny}
                    initialValue={
                      selectedValueByCode.get(definition.code) ?? ""
                    }
                    key={definition.code}
                    label={definition.label}
                    name={`spec.${definition.code}`}
                    options={definition.options}
                  />
                );
              }

              if (definition.dataType === "boolean") {
                return (
                  <SpecificationChoiceField
                    emptyLabel={copy.filterAny}
                    initialValue={
                      selectedValueByCode.get(definition.code) ?? ""
                    }
                    key={definition.code}
                    label={definition.label}
                    name={`spec.${definition.code}`}
                    options={[
                      { label: copy.filterYes, value: "true" },
                      { label: copy.filterNo, value: "false" },
                    ]}
                  />
                );
              }

              return null;
            })}
          </div>
          <button className="primary-button" type="submit">
            {copy.filterApply}
          </button>
        </>
      ) : null}
    </form>
  );

  return (
    <div className="specification-finder">
      <button
        aria-expanded={mobileOpen}
        className="specification-mobile-trigger"
        onClick={() => setMobileOpen(true)}
        type="button"
      >
        <SlidersHorizontal aria-hidden="true" size={19} />
        {copy.filterOpen}
        {filters.length > 0 ? <span>{filters.length}</span> : null}
      </button>
      <button
        aria-hidden="true"
        className={`specification-filter-backdrop ${mobileOpen ? "is-open" : ""}`}
        onClick={() => setMobileOpen(false)}
        tabIndex={-1}
        type="button"
      />
      <div
        className={`specification-filter-drawer ${mobileOpen ? "is-open" : ""}`}
      >
        {form}
      </div>
    </div>
  );
}

import type {
  MetricSpecificationUnit,
  SpecificationDataType,
  UnitSystem,
} from "@/src/modules/catalog/public/specifications";
import { UNIT_SYSTEM_SCHEMA } from "@/src/modules/catalog/public/specifications";
import {
  PRODUCT_CATEGORY_CODE_SCHEMA,
  type ProductCategoryCode,
} from "@/src/modules/catalog/public/product-identity";
import { z } from "zod";

export const SPECIFICATION_FILTER_PAGE_SIZE = 12;

export type LocalizedSpecificationFilterDefinition = {
  baseUnit: MetricSpecificationUnit | null;
  code: string;
  dataType: SpecificationDataType;
  label: string;
  maximumDecimalValue: number | null;
  minimumDecimalValue: number | null;
  options: Array<{ label: string; value: string }>;
};

export type SpecificationFilterValidationDefinition = {
  categoryCode: ProductCategoryCode;
  code: string;
  dataType: SpecificationDataType;
  filterable: boolean;
  maximumDecimalValue: number | null;
  minimumDecimalValue: number | null;
  options: Array<{ value: string }>;
};

export type DecimalRangeSpecificationFilter = {
  attributeCode: string;
  kind: "decimal-range";
  maximum?: number;
  minimum?: number;
};

export type EnumerationSpecificationFilter = {
  attributeCode: string;
  kind: "enumeration";
  value: string;
};

export type BooleanSpecificationFilter = {
  attributeCode: string;
  kind: "boolean";
  value: boolean;
};

export type SpecificationFilter =
  | BooleanSpecificationFilter
  | DecimalRangeSpecificationFilter
  | EnumerationSpecificationFilter;

export type SpecificationFilterIssueCode =
  | "duplicate_parameter"
  | "invalid_category"
  | "invalid_filter_parameter"
  | "invalid_filter_value"
  | "invalid_page"
  | "invalid_range"
  | "invalid_unit"
  | "missing_category"
  | "not_filterable"
  | "page_out_of_range"
  | "unknown_attribute"
  | "wrong_category_attribute";

export type SpecificationFilterIssue = {
  code: SpecificationFilterIssueCode;
  parameter?: string;
};

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

export type ParsedSpecificationFilterRequest = {
  active: boolean;
  categoryCode?: ProductCategoryCode;
  filters: SpecificationFilter[];
  issues: SpecificationFilterIssue[];
  page: number;
  unitSystem: UnitSystem;
};

const PAGE_SCHEMA = z.coerce.number().int().min(1).max(10_000);
const FINITE_NUMBER_SCHEMA = z
  .string()
  .trim()
  .min(1)
  .transform(Number)
  .pipe(z.number().finite());
const SPECIFICATION_PARAMETER_PATTERN =
  /^spec\.([a-z][a-z0-9_]*)(?:\.(min|max))?$/;

function readSingleValue(
  query: CatalogSearchParams,
  name: string,
  issues: SpecificationFilterIssue[],
): string | undefined {
  const value = query[name];

  if (Array.isArray(value)) {
    issues.push({ code: "duplicate_parameter", parameter: name });
    return undefined;
  }

  return value;
}

export function parseSpecificationFilterRequest({
  definitions,
  query,
}: {
  definitions: SpecificationFilterValidationDefinition[];
  query: CatalogSearchParams;
}): ParsedSpecificationFilterRequest {
  const issues: SpecificationFilterIssue[] = [];
  const finder = readSingleValue(query, "finder", issues);
  const hasSpecificationParameter = Object.keys(query).some((key) =>
    key.startsWith("spec."),
  );
  const active =
    finder === "specifications" ||
    hasSpecificationParameter ||
    query.unit !== undefined ||
    query.page !== undefined;
  const rawCategory = readSingleValue(query, "category", issues);
  const parsedCategory = PRODUCT_CATEGORY_CODE_SCHEMA.safeParse(rawCategory);
  const categoryCode = parsedCategory.success ? parsedCategory.data : undefined;

  if (active && rawCategory !== undefined && !parsedCategory.success) {
    issues.push({ code: "invalid_category", parameter: rawCategory });
  }

  const rawUnit = readSingleValue(query, "unit", issues);
  const parsedUnit = UNIT_SYSTEM_SCHEMA.safeParse(rawUnit ?? "metric");
  const unitSystem = parsedUnit.success ? parsedUnit.data : "metric";

  if (rawUnit !== undefined && !parsedUnit.success) {
    issues.push({ code: "invalid_unit", parameter: rawUnit });
  }

  const rawPage = readSingleValue(query, "page", issues);
  const parsedPage = PAGE_SCHEMA.safeParse(rawPage ?? 1);
  const page = parsedPage.success ? parsedPage.data : 1;

  if (rawPage !== undefined && !parsedPage.success) {
    issues.push({ code: "invalid_page", parameter: rawPage });
  }

  if (hasSpecificationParameter && !categoryCode) {
    issues.push({ code: "missing_category" });
  }

  const currentDefinitionByCode = new Map(
    definitions
      .filter((definition) => definition.categoryCode === categoryCode)
      .map((definition) => [definition.code, definition]),
  );
  const categoriesByCode = new Map<string, Set<ProductCategoryCode>>();

  for (const definition of definitions) {
    const categories = categoriesByCode.get(definition.code) ?? new Set();
    categories.add(definition.categoryCode);
    categoriesByCode.set(definition.code, categories);
  }

  const decimalValues = new Map<
    string,
    { maximum?: string; minimum?: string }
  >();
  const filters: SpecificationFilter[] = [];

  for (const [parameter, rawValue] of Object.entries(query)) {
    if (!parameter.startsWith("spec.")) {
      continue;
    }
    if (Array.isArray(rawValue)) {
      issues.push({ code: "duplicate_parameter", parameter });
      continue;
    }

    const match = SPECIFICATION_PARAMETER_PATTERN.exec(parameter);

    if (!match || rawValue === undefined) {
      issues.push({ code: "invalid_filter_parameter", parameter });
      continue;
    }

    if (rawValue.trim() === "") {
      continue;
    }

    const [, attributeCode, rangeBoundary] = match;
    const definition = currentDefinitionByCode.get(attributeCode);

    if (!definition) {
      issues.push({
        code: categoriesByCode.has(attributeCode)
          ? "wrong_category_attribute"
          : "unknown_attribute",
        parameter: attributeCode,
      });
      continue;
    }
    if (!definition.filterable) {
      issues.push({ code: "not_filterable", parameter: attributeCode });
      continue;
    }

    switch (definition.dataType) {
      case "decimal": {
        if (!rangeBoundary) {
          issues.push({ code: "invalid_filter_parameter", parameter });
          break;
        }
        const values = decimalValues.get(attributeCode) ?? {};
        values[rangeBoundary === "min" ? "minimum" : "maximum"] = rawValue;
        decimalValues.set(attributeCode, values);
        break;
      }
      case "enumeration":
        if (
          rangeBoundary ||
          !definition.options.some(({ value }) => value === rawValue)
        ) {
          issues.push({ code: "invalid_filter_value", parameter });
          break;
        }
        filters.push({
          attributeCode,
          kind: "enumeration",
          value: rawValue,
        });
        break;
      case "boolean":
        if (rangeBoundary || !["true", "false"].includes(rawValue)) {
          issues.push({ code: "invalid_filter_value", parameter });
          break;
        }
        filters.push({
          attributeCode,
          kind: "boolean",
          value: rawValue === "true",
        });
        break;
      case "text":
        issues.push({ code: "not_filterable", parameter: attributeCode });
        break;
    }
  }

  for (const [attributeCode, values] of decimalValues) {
    const definition = currentDefinitionByCode.get(attributeCode)!;
    const parsedMinimum =
      values.minimum === undefined
        ? undefined
        : FINITE_NUMBER_SCHEMA.safeParse(values.minimum);
    const parsedMaximum =
      values.maximum === undefined
        ? undefined
        : FINITE_NUMBER_SCHEMA.safeParse(values.maximum);

    if (
      (parsedMinimum !== undefined && !parsedMinimum.success) ||
      (parsedMaximum !== undefined && !parsedMaximum.success)
    ) {
      issues.push({ code: "invalid_filter_value", parameter: attributeCode });
      continue;
    }

    const minimum = parsedMinimum?.data;
    const maximum = parsedMaximum?.data;
    const belowDefinitionMinimum =
      minimum !== undefined &&
      definition.minimumDecimalValue !== null &&
      minimum < definition.minimumDecimalValue;
    const aboveDefinitionMaximum =
      maximum !== undefined &&
      definition.maximumDecimalValue !== null &&
      maximum > definition.maximumDecimalValue;

    if (belowDefinitionMinimum || aboveDefinitionMaximum) {
      issues.push({ code: "invalid_filter_value", parameter: attributeCode });
      continue;
    }
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      issues.push({ code: "invalid_range", parameter: attributeCode });
      continue;
    }

    filters.push({
      attributeCode,
      kind: "decimal-range",
      maximum,
      minimum,
    });
  }

  return { active, categoryCode, filters, issues, page, unitSystem };
}

export function createSpecificationFilterSearchParams({
  categoryCode,
  filters,
  page,
  unitSystem,
}: {
  categoryCode: ProductCategoryCode;
  filters: SpecificationFilter[];
  page: number;
  unitSystem: UnitSystem;
}): URLSearchParams {
  const params = new URLSearchParams({
    finder: "specifications",
    category: categoryCode,
    unit: unitSystem,
    page: String(page),
  });

  for (const filter of [...filters].sort((left, right) =>
    left.attributeCode.localeCompare(right.attributeCode),
  )) {
    switch (filter.kind) {
      case "decimal-range":
        if (filter.minimum !== undefined) {
          params.set(
            `spec.${filter.attributeCode}.min`,
            String(filter.minimum),
          );
        }
        if (filter.maximum !== undefined) {
          params.set(
            `spec.${filter.attributeCode}.max`,
            String(filter.maximum),
          );
        }
        break;
      case "enumeration":
      case "boolean":
        params.set(`spec.${filter.attributeCode}`, String(filter.value));
        break;
    }
  }

  return params;
}

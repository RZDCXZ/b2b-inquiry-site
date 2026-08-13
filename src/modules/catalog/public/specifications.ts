import type { ProductCategoryCode } from "@/src/modules/catalog/public/product-identity";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import { z } from "zod";

export type SpecificationDataType =
  "boolean" | "decimal" | "enumeration" | "text";

export type SpecificationUnit =
  | "cubic_foot_per_minute"
  | "cubic_metre_per_minute"
  | "inch"
  | "kilopascal"
  | "litre_per_minute"
  | "micrometre"
  | "millimetre"
  | "pound_per_square_inch"
  | "us_gallon_per_minute";

export type MetricSpecificationUnit =
  | "cubic_metre_per_minute"
  | "kilopascal"
  | "litre_per_minute"
  | "micrometre"
  | "millimetre";

export type SpecificationAttributeOption = {
  code: string;
  labelEn: string;
  labelZhCn: string;
};

export type SpecificationAttributeDefinition = {
  baseUnit: MetricSpecificationUnit | null;
  code: string;
  dataType: SpecificationDataType;
  filterable: boolean;
  id: string;
  nameEn: string;
  nameZhCn: string;
  options: readonly SpecificationAttributeOption[];
  position: number;
  required: boolean;
};

export type ParsedSpecificationValue = {
  attributeCode: string;
  booleanValue: boolean | null;
  decimalValue: number | null;
  enumerationValue: string | null;
  textValue: string | null;
};

export const UNIT_SYSTEMS = ["metric", "imperial"] as const;

export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

export const UNIT_SYSTEM_SCHEMA = z.enum(UNIT_SYSTEMS);

export type ProductSpecificationDisplay = {
  code: string;
  converted: boolean;
  label: string;
  unit: string | null;
  value: string;
};

export type PersistedSpecificationForDisplay = {
  baseUnit: MetricSpecificationUnit | null;
  booleanValue: boolean | null;
  code: string;
  dataType: SpecificationDataType;
  decimalValue: number | null;
  enumerationValue: string | null;
  nameEn: string;
  nameZhCn: string;
  options: Array<{ code: string; labelEn: string; labelZhCn: string }>;
  textValue: string | null;
};

export type SpecificationValidationCode =
  | "duplicate_attribute"
  | "invalid_enum_option"
  | "invalid_input"
  | "invalid_value_type"
  | "required_attribute_missing"
  | "unit_mismatch"
  | "unknown_attribute";

export class SpecificationValidationError extends Error {
  constructor(
    readonly code: SpecificationValidationCode,
    readonly attributeCode?: string,
  ) {
    super(
      attributeCode
        ? `${code}: ${attributeCode}`
        : `Specification validation failed: ${code}`,
    );
    this.name = "SpecificationValidationError";
  }
}

const specificationValuesSchema = z.array(
  z
    .object({
      attributeCode: z.string().trim().min(1),
      unit: z.string().trim().min(1).optional(),
      value: z.unknown(),
    })
    .strict(),
);

const mediaTypeOptions = [
  { code: "cellulose", labelEn: "Cellulose", labelZhCn: "纤维素" },
  { code: "synthetic", labelEn: "Synthetic", labelZhCn: "合成纤维" },
  {
    code: "activated_carbon",
    labelEn: "Activated carbon",
    labelZhCn: "活性炭",
  },
] as const;

const constructionTypeOptions = [
  { code: "spin_on", labelEn: "Spin-on", labelZhCn: "旋装式" },
  { code: "cartridge", labelEn: "Cartridge", labelZhCn: "滤芯式" },
] as const;

const decimalDefinition = ({
  category,
  code,
  nameEn,
  nameZhCn,
  position,
  unit,
}: {
  category: ProductCategoryCode;
  code: string;
  nameEn: string;
  nameZhCn: string;
  position: number;
  unit: MetricSpecificationUnit;
}): SpecificationAttributeDefinition => ({
  baseUnit: unit,
  code,
  dataType: "decimal",
  filterable: true,
  id: `specification-${category}-${code}`,
  nameEn,
  nameZhCn,
  options: [],
  position,
  required: true,
});

export const INITIAL_SPECIFICATION_DEFINITIONS = {
  air: [
    decimalDefinition({
      category: "air",
      code: "outer_diameter",
      nameEn: "Outer diameter",
      nameZhCn: "外径",
      position: 1,
      unit: "millimetre",
    }),
    decimalDefinition({
      category: "air",
      code: "inner_diameter",
      nameEn: "Inner diameter",
      nameZhCn: "内径",
      position: 2,
      unit: "millimetre",
    }),
    decimalDefinition({
      category: "air",
      code: "height",
      nameEn: "Height",
      nameZhCn: "高度",
      position: 3,
      unit: "millimetre",
    }),
    {
      baseUnit: null,
      code: "media_type",
      dataType: "enumeration",
      filterable: true,
      id: "specification-air-media_type",
      nameEn: "Media type",
      nameZhCn: "滤材类型",
      options: mediaTypeOptions,
      position: 4,
      required: true,
    },
    decimalDefinition({
      category: "air",
      code: "rated_air_flow",
      nameEn: "Rated air flow",
      nameZhCn: "额定空气流量",
      position: 5,
      unit: "cubic_metre_per_minute",
    }),
  ],
  cabin: [
    decimalDefinition({
      category: "cabin",
      code: "length",
      nameEn: "Length",
      nameZhCn: "长度",
      position: 1,
      unit: "millimetre",
    }),
    decimalDefinition({
      category: "cabin",
      code: "width",
      nameEn: "Width",
      nameZhCn: "宽度",
      position: 2,
      unit: "millimetre",
    }),
    decimalDefinition({
      category: "cabin",
      code: "height",
      nameEn: "Height",
      nameZhCn: "高度",
      position: 3,
      unit: "millimetre",
    }),
    {
      baseUnit: null,
      code: "media_type",
      dataType: "enumeration",
      filterable: true,
      id: "specification-cabin-media_type",
      nameEn: "Media type",
      nameZhCn: "滤材类型",
      options: mediaTypeOptions,
      position: 4,
      required: true,
    },
    decimalDefinition({
      category: "cabin",
      code: "rated_air_flow",
      nameEn: "Rated air flow",
      nameZhCn: "额定空气流量",
      position: 5,
      unit: "cubic_metre_per_minute",
    }),
  ],
  fuel: [
    {
      baseUnit: null,
      code: "construction_type",
      dataType: "enumeration",
      filterable: true,
      id: "specification-fuel-construction_type",
      nameEn: "Construction type",
      nameZhCn: "结构形式",
      options: constructionTypeOptions,
      position: 1,
      required: true,
    },
    decimalDefinition({
      category: "fuel",
      code: "outer_diameter",
      nameEn: "Outer diameter",
      nameZhCn: "外径",
      position: 2,
      unit: "millimetre",
    }),
    decimalDefinition({
      category: "fuel",
      code: "height",
      nameEn: "Height",
      nameZhCn: "高度",
      position: 3,
      unit: "millimetre",
    }),
    {
      baseUnit: null,
      code: "connection_specification",
      dataType: "text",
      filterable: false,
      id: "specification-fuel-connection_specification",
      nameEn: "Connection specification",
      nameZhCn: "接口规格",
      options: [],
      position: 4,
      required: true,
    },
    decimalDefinition({
      category: "fuel",
      code: "filtration_rating",
      nameEn: "Filtration rating",
      nameZhCn: "过滤精度",
      position: 5,
      unit: "micrometre",
    }),
    decimalDefinition({
      category: "fuel",
      code: "rated_flow",
      nameEn: "Rated flow",
      nameZhCn: "额定流量",
      position: 6,
      unit: "litre_per_minute",
    }),
    {
      baseUnit: null,
      code: "water_separation",
      dataType: "boolean",
      filterable: true,
      id: "specification-fuel-water_separation",
      nameEn: "Water separation",
      nameZhCn: "油水分离",
      options: [],
      position: 7,
      required: true,
    },
  ],
  oil: [
    {
      baseUnit: null,
      code: "construction_type",
      dataType: "enumeration",
      filterable: true,
      id: "specification-oil-construction_type",
      nameEn: "Construction type",
      nameZhCn: "结构形式",
      options: constructionTypeOptions,
      position: 1,
      required: true,
    },
    decimalDefinition({
      category: "oil",
      code: "outer_diameter",
      nameEn: "Outer diameter",
      nameZhCn: "外径",
      position: 2,
      unit: "millimetre",
    }),
    decimalDefinition({
      category: "oil",
      code: "inner_diameter",
      nameEn: "Inner diameter",
      nameZhCn: "内径",
      position: 3,
      unit: "millimetre",
    }),
    decimalDefinition({
      category: "oil",
      code: "height",
      nameEn: "Height",
      nameZhCn: "高度",
      position: 4,
      unit: "millimetre",
    }),
    {
      baseUnit: null,
      code: "thread_specification",
      dataType: "text",
      filterable: false,
      id: "specification-oil-thread_specification",
      nameEn: "Thread specification",
      nameZhCn: "螺纹规格",
      options: [],
      position: 5,
      required: true,
    },
    decimalDefinition({
      category: "oil",
      code: "bypass_valve_opening_pressure",
      nameEn: "Bypass valve opening pressure",
      nameZhCn: "旁通阀开启压力",
      position: 6,
      unit: "kilopascal",
    }),
    {
      baseUnit: null,
      code: "anti_drainback_valve",
      dataType: "boolean",
      filterable: true,
      id: "specification-oil-anti_drainback_valve",
      nameEn: "Anti-drainback valve",
      nameZhCn: "止回阀",
      options: [],
      position: 7,
      required: true,
    },
  ],
} as const satisfies Record<
  ProductCategoryCode,
  readonly SpecificationAttributeDefinition[]
>;

export function parseSpecificationValues(
  definitions: readonly SpecificationAttributeDefinition[],
  input: unknown,
): ParsedSpecificationValue[] {
  const parsedInput = specificationValuesSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new SpecificationValidationError("invalid_input");
  }

  const definitionByCode = new Map(
    definitions.map((definition) => [definition.code, definition]),
  );
  const seenCodes = new Set<string>();

  for (const value of parsedInput.data) {
    if (seenCodes.has(value.attributeCode)) {
      throw new SpecificationValidationError(
        "duplicate_attribute",
        value.attributeCode,
      );
    }

    if (!definitionByCode.has(value.attributeCode)) {
      throw new SpecificationValidationError(
        "unknown_attribute",
        value.attributeCode,
      );
    }

    seenCodes.add(value.attributeCode);
  }

  const missingDefinition = definitions.find(
    ({ code, required }) => required && !seenCodes.has(code),
  );

  if (missingDefinition) {
    throw new SpecificationValidationError(
      "required_attribute_missing",
      missingDefinition.code,
    );
  }

  return parsedInput.data.map(({ attributeCode, unit, value }) => {
    const definition = definitionByCode.get(attributeCode)!;
    const emptyValue = {
      attributeCode,
      booleanValue: null,
      decimalValue: null,
      enumerationValue: null,
      textValue: null,
    };

    switch (definition.dataType) {
      case "decimal":
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new SpecificationValidationError(
            "invalid_value_type",
            attributeCode,
          );
        }
        if (unit !== definition.baseUnit) {
          throw new SpecificationValidationError(
            "unit_mismatch",
            attributeCode,
          );
        }
        return { ...emptyValue, decimalValue: value };
      case "enumeration":
        if (typeof value !== "string") {
          throw new SpecificationValidationError(
            "invalid_value_type",
            attributeCode,
          );
        }
        if (!definition.options.some(({ code }) => code === value)) {
          throw new SpecificationValidationError(
            "invalid_enum_option",
            attributeCode,
          );
        }
        if (unit !== undefined) {
          throw new SpecificationValidationError(
            "unit_mismatch",
            attributeCode,
          );
        }
        return { ...emptyValue, enumerationValue: value };
      case "text":
        if (typeof value !== "string" || value.trim().length === 0) {
          throw new SpecificationValidationError(
            "invalid_value_type",
            attributeCode,
          );
        }
        if (unit !== undefined) {
          throw new SpecificationValidationError(
            "unit_mismatch",
            attributeCode,
          );
        }
        return { ...emptyValue, textValue: value.trim() };
      case "boolean":
        if (typeof value !== "boolean") {
          throw new SpecificationValidationError(
            "invalid_value_type",
            attributeCode,
          );
        }
        if (unit !== undefined) {
          throw new SpecificationValidationError(
            "unit_mismatch",
            attributeCode,
          );
        }
        return { ...emptyValue, booleanValue: value };
    }
  });
}

const conversionFamilies = [
  {
    imperial: "inch",
    metric: "millimetre",
    metricPerImperial: 25.4,
  },
  {
    imperial: "pound_per_square_inch",
    metric: "kilopascal",
    metricPerImperial: 6.894757293168,
  },
  {
    imperial: "us_gallon_per_minute",
    metric: "litre_per_minute",
    metricPerImperial: 3.785411784,
  },
  {
    imperial: "cubic_foot_per_minute",
    metric: "cubic_metre_per_minute",
    metricPerImperial: 0.028316846592,
  },
] as const;

const imperialUnitByMetric = {
  cubic_metre_per_minute: "cubic_foot_per_minute",
  kilopascal: "pound_per_square_inch",
  litre_per_minute: "us_gallon_per_minute",
  micrometre: "micrometre",
  millimetre: "inch",
} as const satisfies Record<MetricSpecificationUnit, SpecificationUnit>;

const unitLabels: Record<SpecificationUnit, string> = {
  cubic_foot_per_minute: "ft³/min",
  cubic_metre_per_minute: "m³/min",
  inch: "in",
  kilopascal: "kPa",
  litre_per_minute: "L/min",
  micrometre: "μm",
  millimetre: "mm",
  pound_per_square_inch: "psi",
  us_gallon_per_minute: "US gal/min",
};

export function convertSpecificationUnit({
  from,
  to,
  value,
}: {
  from: SpecificationUnit;
  to: SpecificationUnit;
  value: number;
}): number {
  if (from === to) {
    return roundSpecificationNumber(value);
  }

  const family = conversionFamilies.find(
    ({ imperial, metric }) =>
      (from === metric && to === imperial) ||
      (from === imperial && to === metric),
  );

  if (!family) {
    throw new RangeError(
      `Unsupported specification conversion: ${from} to ${to}`,
    );
  }

  const converted =
    from === family.metric
      ? value / family.metricPerImperial
      : value * family.metricPerImperial;

  return roundSpecificationNumber(converted);
}

function roundSpecificationNumber(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatProductSpecification(
  specification: PersistedSpecificationForDisplay,
  { locale, unitSystem }: { locale: PublicLocale; unitSystem: UnitSystem },
): ProductSpecificationDisplay {
  const label = locale === "en" ? specification.nameEn : specification.nameZhCn;
  const display = {
    code: specification.code,
    converted: false,
    label,
    unit: null,
    value: "",
  } satisfies ProductSpecificationDisplay;

  switch (specification.dataType) {
    case "decimal": {
      const baseUnit = specification.baseUnit!;
      const displayUnit =
        unitSystem === "imperial" ? imperialUnitByMetric[baseUnit] : baseUnit;
      const value = specification.decimalValue!;

      return {
        ...display,
        converted: displayUnit !== baseUnit,
        unit: unitLabels[displayUnit],
        value: String(
          displayUnit === baseUnit
            ? roundSpecificationNumber(value)
            : convertSpecificationUnit({
                from: baseUnit,
                to: displayUnit,
                value,
              }),
        ),
      };
    }
    case "enumeration": {
      const option = specification.options.find(
        ({ code }) => code === specification.enumerationValue,
      );
      return {
        ...display,
        value:
          (locale === "en" ? option?.labelEn : option?.labelZhCn) ??
          specification.enumerationValue ??
          "",
      };
    }
    case "text":
      return { ...display, value: specification.textValue ?? "" };
    case "boolean":
      return {
        ...display,
        value:
          locale === "en"
            ? specification.booleanValue
              ? "Yes"
              : "No"
            : specification.booleanValue
              ? "是"
              : "否",
      };
  }
}

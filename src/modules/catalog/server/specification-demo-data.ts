import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  DEMO_PUBLISHED_PRODUCTS,
  type DemoCatalogProduct,
} from "@/src/modules/catalog/public/demo-catalog-fixtures";
import {
  createSpecificationSnapshotValues,
  INITIAL_SPECIFICATION_DEFINITIONS,
  type MetricSpecificationUnit,
} from "@/src/modules/catalog/public/specifications";

const categoryIds = {
  air: "category-air",
  cabin: "category-cabin",
  fuel: "category-fuel",
  oil: "category-oil",
} as const;

type SpecificationInput = {
  attributeCode: string;
  unit?: MetricSpecificationUnit;
  value: boolean | number | string;
};

const exactSpecificationInputs: Record<string, SpecificationInput[]> = {
  "TQ-AF-2000": [
    { attributeCode: "outer_diameter", unit: "millimetre", value: 280 },
    { attributeCode: "inner_diameter", unit: "millimetre", value: 160 },
    { attributeCode: "height", unit: "millimetre", value: 460 },
    { attributeCode: "media_type", value: "cellulose" },
    {
      attributeCode: "rated_air_flow",
      unit: "cubic_metre_per_minute",
      value: 21,
    },
  ],
  "TQ-AF-2106": [
    { attributeCode: "outer_diameter", unit: "millimetre", value: 285 },
    { attributeCode: "inner_diameter", unit: "millimetre", value: 165 },
    { attributeCode: "height", unit: "millimetre", value: 480 },
    { attributeCode: "media_type", value: "synthetic" },
    {
      attributeCode: "rated_air_flow",
      unit: "cubic_metre_per_minute",
      value: 24,
    },
  ],
  "TQ-CF-3021": [
    { attributeCode: "length", unit: "millimetre", value: 310 },
    { attributeCode: "width", unit: "millimetre", value: 225 },
    { attributeCode: "height", unit: "millimetre", value: 35 },
    { attributeCode: "media_type", value: "activated_carbon" },
    {
      attributeCode: "rated_air_flow",
      unit: "cubic_metre_per_minute",
      value: 7.5,
    },
  ],
  "TQ-FL-4720": [
    { attributeCode: "construction_type", value: "spin_on" },
    { attributeCode: "outer_diameter", unit: "millimetre", value: 94 },
    { attributeCode: "height", unit: "millimetre", value: 172 },
    { attributeCode: "connection_specification", value: "M16 × 1.5" },
    { attributeCode: "filtration_rating", unit: "micrometre", value: 12 },
    { attributeCode: "rated_flow", unit: "litre_per_minute", value: 4.8 },
    { attributeCode: "water_separation", value: true },
  ],
  "TQ-FL-4827": [
    { attributeCode: "construction_type", value: "spin_on" },
    { attributeCode: "outer_diameter", unit: "millimetre", value: 96 },
    { attributeCode: "height", unit: "millimetre", value: 178 },
    { attributeCode: "connection_specification", value: "M16 × 1.5" },
    { attributeCode: "filtration_rating", unit: "micrometre", value: 10 },
    { attributeCode: "rated_flow", unit: "litre_per_minute", value: 5.2 },
    { attributeCode: "water_separation", value: true },
  ],
  "TQ-OF-1038": [
    { attributeCode: "construction_type", value: "spin_on" },
    { attributeCode: "outer_diameter", unit: "millimetre", value: 93 },
    { attributeCode: "inner_diameter", unit: "millimetre", value: 72 },
    { attributeCode: "height", unit: "millimetre", value: 142 },
    { attributeCode: "thread_specification", value: "M27 × 2" },
    {
      attributeCode: "bypass_valve_opening_pressure",
      unit: "kilopascal",
      value: 172,
    },
    { attributeCode: "anti_drainback_valve", value: true },
  ],
};

export function demoSpecificationInputsForProduct(
  product: Pick<DemoCatalogProduct, "categoryCode" | "partNumber">,
): SpecificationInput[] {
  const exact = exactSpecificationInputs[product.partNumber];
  if (exact) return exact;
  const sequence = Number(product.partNumber.match(/\d+$/u)?.[0] ?? "1") % 20;

  if (product.categoryCode === "air") {
    return [
      {
        attributeCode: "outer_diameter",
        unit: "millimetre",
        value: 245 + sequence,
      },
      {
        attributeCode: "inner_diameter",
        unit: "millimetre",
        value: 135 + sequence,
      },
      { attributeCode: "height", unit: "millimetre", value: 390 + sequence },
      {
        attributeCode: "media_type",
        value: sequence % 2 === 0 ? "cellulose" : "synthetic",
      },
      {
        attributeCode: "rated_air_flow",
        unit: "cubic_metre_per_minute",
        value: 18 + sequence / 10,
      },
    ];
  }

  if (product.categoryCode === "cabin") {
    return [
      { attributeCode: "length", unit: "millimetre", value: 260 + sequence },
      { attributeCode: "width", unit: "millimetre", value: 180 + sequence },
      { attributeCode: "height", unit: "millimetre", value: 28 + sequence },
      {
        attributeCode: "media_type",
        value: sequence % 2 === 0 ? "activated_carbon" : "synthetic",
      },
      {
        attributeCode: "rated_air_flow",
        unit: "cubic_metre_per_minute",
        value: 6 + sequence / 10,
      },
    ];
  }

  if (product.categoryCode === "fuel") {
    return [
      { attributeCode: "construction_type", value: "spin_on" },
      {
        attributeCode: "outer_diameter",
        unit: "millimetre",
        value: 106 + sequence / 2,
      },
      { attributeCode: "height", unit: "millimetre", value: 182 + sequence },
      { attributeCode: "connection_specification", value: "M18 × 1.5" },
      {
        attributeCode: "filtration_rating",
        unit: "micrometre",
        value: 8 + (sequence % 4),
      },
      {
        attributeCode: "rated_flow",
        unit: "litre_per_minute",
        value: 5.5 + sequence / 10,
      },
      { attributeCode: "water_separation", value: true },
    ];
  }

  return [
    { attributeCode: "construction_type", value: "spin_on" },
    {
      attributeCode: "outer_diameter",
      unit: "millimetre",
      value: 88 + sequence / 2,
    },
    {
      attributeCode: "inner_diameter",
      unit: "millimetre",
      value: 64 + sequence / 2,
    },
    { attributeCode: "height", unit: "millimetre", value: 130 + sequence },
    { attributeCode: "thread_specification", value: "M24 × 1.5" },
    {
      attributeCode: "bypass_valve_opening_pressure",
      unit: "kilopascal",
      value: 155 + sequence,
    },
    { attributeCode: "anti_drainback_valve", value: true },
  ];
}

async function writeSpecificationDemoData(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  await transaction.$executeRaw`
    SELECT set_config(
      'torquelis.allow_product_publication_mutation',
      'on',
      true
    )
  `;

  for (const [category, definitions] of Object.entries(
    INITIAL_SPECIFICATION_DEFINITIONS,
  )) {
    const categoryId = categoryIds[category as keyof typeof categoryIds];

    for (const definition of definitions) {
      await transaction.specificationAttributeDefinition.upsert({
        create: {
          baseUnit: definition.baseUnit,
          categoryId,
          code: definition.code,
          dataType: definition.dataType,
          filterable: definition.filterable,
          id: definition.id,
          maximumDecimalValue: definition.maximumDecimalValue,
          minimumDecimalValue: definition.minimumDecimalValue,
          nameEn: definition.nameEn,
          nameZhCn: definition.nameZhCn,
          position: definition.position,
          required: definition.required,
        },
        update: {
          baseUnit: definition.baseUnit,
          categoryId,
          code: definition.code,
          dataType: definition.dataType,
          filterable: definition.filterable,
          maximumDecimalValue: definition.maximumDecimalValue,
          minimumDecimalValue: definition.minimumDecimalValue,
          nameEn: definition.nameEn,
          nameZhCn: definition.nameZhCn,
          position: definition.position,
          required: definition.required,
        },
        where: { id: definition.id },
      });

      await transaction.specificationAttributeOption.deleteMany({
        where: { attributeId: definition.id },
      });
      if (definition.options.length > 0) {
        await transaction.specificationAttributeOption.createMany({
          data: definition.options.map((option, index) => ({
            ...option,
            attributeId: definition.id,
            position: index + 1,
          })),
        });
      }
    }
  }

  await transaction.productSpecificationValue.deleteMany();
  for (const product of DEMO_PUBLISHED_PRODUCTS) {
    const definitions = INITIAL_SPECIFICATION_DEFINITIONS[product.categoryCode];
    const values = createSpecificationSnapshotValues(
      definitions,
      demoSpecificationInputsForProduct(product),
    );

    await transaction.productSpecificationValue.createMany({
      data: values.map((value) => ({
        attributeCode: value.attributeCode,
        attributeId: value.attributeId,
        baseUnit: value.baseUnit,
        booleanValue: value.booleanValue,
        dataType: value.dataType,
        decimalValue: value.decimalValue,
        enumerationLabelEn: value.enumerationLabelEn,
        enumerationLabelZhCn: value.enumerationLabelZhCn,
        enumerationValue: value.enumerationValue,
        nameEn: value.nameEn,
        nameZhCn: value.nameZhCn,
        position: value.position,
        publicationId: product.publicationId!,
        textValue: value.textValue,
      })),
    });
  }
}

export async function seedSpecificationDemoData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction((transaction) =>
    writeSpecificationDemoData(transaction),
  );
}

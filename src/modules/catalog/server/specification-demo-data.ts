import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  INITIAL_SPECIFICATION_DEFINITIONS,
  parseSpecificationValues,
} from "@/src/modules/catalog/public/specifications";

const categoryIds = {
  air: "category-air",
  cabin: "category-cabin",
  fuel: "category-fuel",
  oil: "category-oil",
} as const;

const productSpecificationInputs = [
  {
    category: "air",
    publicationId: "publication-product-tq-af-2106-v1",
    values: [
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
  },
  {
    category: "cabin",
    publicationId: "publication-product-tq-cf-3021-v1",
    values: [
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
  },
  {
    category: "fuel",
    publicationId: "publication-product-tq-fl-4827-v1",
    values: [
      { attributeCode: "construction_type", value: "spin_on" },
      { attributeCode: "outer_diameter", unit: "millimetre", value: 96 },
      { attributeCode: "height", unit: "millimetre", value: 178 },
      { attributeCode: "connection_specification", value: "M16 × 1.5" },
      {
        attributeCode: "filtration_rating",
        unit: "micrometre",
        value: 10,
      },
      {
        attributeCode: "rated_flow",
        unit: "litre_per_minute",
        value: 5.2,
      },
      { attributeCode: "water_separation", value: true },
    ],
  },
  {
    category: "oil",
    publicationId: "publication-product-tq-of-1038-v1",
    values: [
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
  },
] as const;

async function writeSpecificationDemoData(
  transaction: Prisma.TransactionClient,
): Promise<void> {
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
  for (const input of productSpecificationInputs) {
    const definitions = INITIAL_SPECIFICATION_DEFINITIONS[input.category];
    const definitionByCode = new Map(
      definitions.map((definition) => [definition.code, definition]),
    );
    const values = parseSpecificationValues(definitions, input.values);

    await transaction.productSpecificationValue.createMany({
      data: values.map((value) => ({
        attributeId: definitionByCode.get(value.attributeCode)!.id,
        booleanValue: value.booleanValue,
        decimalValue: value.decimalValue,
        enumerationValue: value.enumerationValue,
        publicationId: input.publicationId,
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

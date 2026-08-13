import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  createSpecificationSnapshotValues,
  INITIAL_SPECIFICATION_DEFINITIONS,
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
    publicationId: "publication-product-tq-af-2000-v1",
    values: [
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
  },
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
    publicationId: "publication-product-tq-fl-4720-v1",
    values: [
      { attributeCode: "construction_type", value: "spin_on" },
      { attributeCode: "outer_diameter", unit: "millimetre", value: 94 },
      { attributeCode: "height", unit: "millimetre", value: 172 },
      { attributeCode: "connection_specification", value: "M16 × 1.5" },
      {
        attributeCode: "filtration_rating",
        unit: "micrometre",
        value: 12,
      },
      {
        attributeCode: "rated_flow",
        unit: "litre_per_minute",
        value: 4.8,
      },
      { attributeCode: "water_separation", value: true },
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
  for (const input of productSpecificationInputs) {
    const definitions = INITIAL_SPECIFICATION_DEFINITIONS[input.category];
    const values = createSpecificationSnapshotValues(definitions, input.values);

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

import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  parseSpecificationValues,
  SpecificationValidationError,
  type SpecificationAttributeDefinition,
} from "@/src/modules/catalog/public/specifications";

export async function replaceProductSpecifications(
  prisma: PrismaClient,
  {
    productId,
    values,
  }: {
    productId: string;
    values: unknown;
  },
): Promise<void> {
  const product = await prisma.product.findUnique({
    select: {
      category: {
        select: {
          specificationAttributes: {
            include: { options: { orderBy: { position: "asc" } } },
            orderBy: { position: "asc" },
          },
        },
      },
    },
    where: { id: productId },
  });

  if (!product) {
    throw new SpecificationValidationError("invalid_input");
  }

  const definitions: SpecificationAttributeDefinition[] =
    product.category.specificationAttributes.map((definition) => ({
      ...definition,
      baseUnit: definition.baseUnit,
      options: definition.options,
    }));
  const parsedValues = parseSpecificationValues(definitions, values);
  const definitionByCode = new Map(
    product.category.specificationAttributes.map((definition) => [
      definition.code,
      definition,
    ]),
  );

  await prisma.$transaction(async (transaction) => {
    await transaction.productSpecificationValue.deleteMany({
      where: { productId },
    });
    await transaction.productSpecificationValue.createMany({
      data: parsedValues.map((value) => ({
        attributeId: definitionByCode.get(value.attributeCode)!.id,
        booleanValue: value.booleanValue,
        decimalValue: value.decimalValue,
        enumerationValue: value.enumerationValue,
        productId,
        textValue: value.textValue,
      })) satisfies Prisma.ProductSpecificationValueCreateManyInput[],
    });
  });
}

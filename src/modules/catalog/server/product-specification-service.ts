import type { PrismaClient } from "@/src/generated/prisma/client";
import {
  parseSpecificationValues,
  SpecificationValidationError,
  type ParsedSpecificationValue,
  type SpecificationAttributeDefinition,
} from "@/src/modules/catalog/public/specifications";

export async function validateProductSpecificationsForCategory(
  prisma: PrismaClient,
  {
    categoryId,
    values,
  }: {
    categoryId: string;
    values: unknown;
  },
): Promise<ParsedSpecificationValue[]> {
  const category = await prisma.productCategory.findUnique({
    select: {
      specificationAttributes: {
        include: { options: { orderBy: { position: "asc" } } },
        orderBy: { position: "asc" },
      },
    },
    where: { id: categoryId },
  });

  if (!category) {
    throw new SpecificationValidationError("invalid_input");
  }

  const definitions: SpecificationAttributeDefinition[] =
    category.specificationAttributes.map((definition) => ({
      ...definition,
      baseUnit: definition.baseUnit,
      options: definition.options,
    }));

  return parseSpecificationValues(definitions, values);
}

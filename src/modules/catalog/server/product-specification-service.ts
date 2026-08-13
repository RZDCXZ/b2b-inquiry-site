import type { PrismaClient } from "@/src/generated/prisma/client";
import {
  createSpecificationSnapshotValues,
  SpecificationValidationError,
  type SpecificationAttributeDefinition,
  type SpecificationSnapshotValue,
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
): Promise<SpecificationSnapshotValue[]> {
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
      maximumDecimalValue: definition.maximumDecimalValue?.toNumber() ?? null,
      minimumDecimalValue: definition.minimumDecimalValue?.toNumber() ?? null,
      options: definition.options,
    }));

  return createSpecificationSnapshotValues(definitions, values);
}

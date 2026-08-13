import type { PrismaClient } from "@/src/generated/prisma/client";
import type { PersistedSpecificationForDisplay } from "@/src/modules/catalog/public/specifications";

export async function listProductSpecifications(
  prisma: PrismaClient,
  publicationId: string,
): Promise<PersistedSpecificationForDisplay[]> {
  const values = await prisma.productSpecificationValue.findMany({
    include: {
      attribute: {
        include: { options: { orderBy: { position: "asc" } } },
      },
    },
    orderBy: { attribute: { position: "asc" } },
    where: { publicationId },
  });

  return values.map(({ attribute, ...value }) => ({
    baseUnit: attribute.baseUnit,
    booleanValue: value.booleanValue,
    code: attribute.code,
    dataType: attribute.dataType,
    decimalValue: value.decimalValue?.toNumber() ?? null,
    enumerationValue: value.enumerationValue,
    nameEn: attribute.nameEn,
    nameZhCn: attribute.nameZhCn,
    options: attribute.options,
    textValue: value.textValue,
  }));
}

import type { PrismaClient } from "@/src/generated/prisma/client";
import type { PersistedSpecificationForDisplay } from "@/src/modules/catalog/public/specifications";

export async function listProductSpecifications(
  prisma: PrismaClient,
  publicationId: string,
): Promise<PersistedSpecificationForDisplay[]> {
  const values = await prisma.productSpecificationValue.findMany({
    orderBy: { position: "asc" },
    where: { publicationId },
  });

  return values.map((value) => ({
    baseUnit: value.baseUnit,
    booleanValue: value.booleanValue,
    code: value.attributeCode,
    dataType: value.dataType,
    decimalValue: value.decimalValue?.toNumber() ?? null,
    enumerationLabelEn: value.enumerationLabelEn,
    enumerationLabelZhCn: value.enumerationLabelZhCn,
    enumerationValue: value.enumerationValue,
    nameEn: value.nameEn,
    nameZhCn: value.nameZhCn,
    textValue: value.textValue,
  }));
}

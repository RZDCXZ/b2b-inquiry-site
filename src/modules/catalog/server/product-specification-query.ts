import type { PrismaClient } from "@/src/generated/prisma/client";
import type {
  MetricSpecificationUnit,
  SpecificationDataType,
} from "@/src/modules/catalog/public/specifications";

export type PersistedProductSpecification = {
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

export async function listProductSpecifications(
  prisma: PrismaClient,
  productId: string,
): Promise<PersistedProductSpecification[]> {
  const values = await prisma.productSpecificationValue.findMany({
    include: {
      attribute: {
        include: { options: { orderBy: { position: "asc" } } },
      },
    },
    orderBy: { attribute: { position: "asc" } },
    where: { productId },
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

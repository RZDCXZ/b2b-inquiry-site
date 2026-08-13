import type { PrismaClient } from "@/src/generated/prisma/client";
import type { PersistedSpecificationForDisplay } from "@/src/modules/catalog/public/specifications";
import type {
  MetricSpecificationUnit,
  SpecificationDataType,
} from "@/src/modules/catalog/public/specifications";
import type { ProductCategoryCode } from "@/src/modules/catalog/public/product-identity";

export type CatalogSpecificationFilterDefinition = {
  baseUnit: MetricSpecificationUnit | null;
  categoryCode: ProductCategoryCode;
  code: string;
  dataType: SpecificationDataType;
  filterable: boolean;
  maximumDecimalValue: number | null;
  minimumDecimalValue: number | null;
  nameEn: string;
  nameZhCn: string;
  options: Array<{ code: string; labelEn: string; labelZhCn: string }>;
};

export async function listCatalogSpecificationAttributeDefinitions(
  prisma: PrismaClient,
): Promise<CatalogSpecificationFilterDefinition[]> {
  const definitions = await prisma.specificationAttributeDefinition.findMany({
    orderBy: { position: "asc" },
    select: {
      baseUnit: true,
      category: { select: { code: true } },
      code: true,
      dataType: true,
      filterable: true,
      maximumDecimalValue: true,
      minimumDecimalValue: true,
      nameEn: true,
      nameZhCn: true,
      options: {
        orderBy: { position: "asc" },
        select: { code: true, labelEn: true, labelZhCn: true },
      },
    },
  });

  return definitions.map((definition) => ({
    ...definition,
    baseUnit: definition.baseUnit as MetricSpecificationUnit | null,
    categoryCode: definition.category.code as ProductCategoryCode,
    dataType: definition.dataType as SpecificationDataType,
    maximumDecimalValue: definition.maximumDecimalValue?.toNumber() ?? null,
    minimumDecimalValue: definition.minimumDecimalValue?.toNumber() ?? null,
  }));
}

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

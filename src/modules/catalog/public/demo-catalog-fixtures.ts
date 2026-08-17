export const DEMO_DATASET_TIMESTAMP = new Date("2026-08-17T04:00:00.000Z");

export const DEMO_CATALOG_CATEGORIES = [
  {
    code: "air",
    id: "category-air",
    nameEn: "Air filters",
    nameZhCn: "空气滤清器",
    position: 1,
  },
  {
    code: "oil",
    id: "category-oil",
    nameEn: "Oil filters",
    nameZhCn: "机油滤清器",
    position: 2,
  },
  {
    code: "fuel",
    id: "category-fuel",
    nameEn: "Fuel filters",
    nameZhCn: "燃油滤清器",
    position: 3,
  },
  {
    code: "cabin",
    id: "category-cabin",
    nameEn: "Cabin filters",
    nameZhCn: "空调滤清器",
    position: 4,
  },
] as const;

export type DemoCatalogCategoryCode =
  (typeof DEMO_CATALOG_CATEGORIES)[number]["code"];

export type DemoProductReference = {
  brand: string;
  referenceNumber: string;
};

export type DemoCatalogProduct = {
  categoryCode: DemoCatalogCategoryCode;
  categoryId: string;
  descriptionEn: string;
  descriptionZhCn: string;
  fitmentSummaryEn: string;
  fitmentSummaryZhCn: string;
  id: string;
  imageAssetId: string;
  imagePath: string;
  nameEn: string;
  nameZhCn: string;
  partNumber: string;
  publicationId: string | null;
  references: readonly DemoProductReference[];
  replacementProductId: string | null;
  seoDescriptionEn: string;
  seoDescriptionZhCn: string;
  seoTitleEn: string;
  seoTitleZhCn: string;
  slugEn: string;
  slugZhCn: string;
  status: "discontinued" | "draft" | "published";
  summaryEn: string;
  summaryZhCn: string;
};

function productContent({
  nameEn,
  nameZhCn,
  partNumber,
  status = "published",
}: {
  nameEn: string;
  nameZhCn: string;
  partNumber: string;
  status?: DemoCatalogProduct["status"];
}) {
  const isDiscontinued = status === "discontinued";
  const stateEn = isDiscontinued ? "discontinued " : "";
  const stateZhCn = isDiscontinued ? "已停产" : "";
  const summaryEn = `${isDiscontinued ? "Discontinued" : "Standard"} fictional replacement filter for maintained commercial vehicle applications.`;
  const summaryZhCn = `${stateZhCn || "标准"}虚构商用车替换滤清器，用于可维护目录演示。`;

  return {
    descriptionEn: `${summaryEn} Demonstration performance data must not be used for selection or purchasing.`,
    descriptionZhCn: `${summaryZhCn} 演示性能数据不可用于真实选型或采购。`,
    fitmentSummaryEn: `Selected fictional ${stateEn}commercial vehicle applications.`,
    fitmentSummaryZhCn: `适用于指定虚构${stateZhCn}商用车型。`,
    nameEn,
    nameZhCn,
    seoDescriptionEn: summaryEn,
    seoDescriptionZhCn: summaryZhCn,
    seoTitleEn: `${nameEn} | Torquelis Filters`,
    seoTitleZhCn: `${nameZhCn}｜拓擎利滤清`,
    slugEn: nameEn
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/gu, "-")
      .replaceAll(/^-|-$/gu, ""),
    slugZhCn: `${nameZhCn}-${partNumber.toLowerCase()}`,
    summaryEn,
    summaryZhCn,
  };
}

function productFixture(
  input: Pick<
    DemoCatalogProduct,
    | "categoryCode"
    | "id"
    | "nameEn"
    | "nameZhCn"
    | "partNumber"
    | "publicationId"
    | "references"
    | "replacementProductId"
    | "status"
  > &
    Partial<
      Pick<
        DemoCatalogProduct,
        | "descriptionEn"
        | "descriptionZhCn"
        | "fitmentSummaryEn"
        | "fitmentSummaryZhCn"
        | "seoDescriptionEn"
        | "seoDescriptionZhCn"
        | "seoTitleEn"
        | "seoTitleZhCn"
        | "slugEn"
        | "slugZhCn"
        | "summaryEn"
        | "summaryZhCn"
      >
    >,
): DemoCatalogProduct {
  const category = DEMO_CATALOG_CATEGORIES.find(
    ({ code }) => code === input.categoryCode,
  );
  if (!category)
    throw new Error(`Unknown demo category: ${input.categoryCode}`);
  const content = productContent(input);
  const imagePath =
    input.categoryCode === "fuel"
      ? "/assets/fuel-filter-product.png"
      : "/assets/filter-family.png";

  return {
    ...content,
    ...input,
    categoryId: category.id,
    imageAssetId:
      input.categoryCode === "fuel"
        ? "asset-generated-fuel-filter-product"
        : "asset-generated-filter-family",
    imagePath,
  };
}

const specialProducts: DemoCatalogProduct[] = [
  productFixture({
    categoryCode: "air",
    id: "product-tq-af-2000",
    nameEn: "Legacy Air Filter",
    nameZhCn: "历史空气滤清器",
    partNumber: "TQ-AF-2000",
    publicationId: "publication-product-tq-af-2000-v1",
    references: [
      { brand: "Novera", referenceNumber: "NAF-2000" },
      { brand: "Arvento", referenceNumber: "ARA-2000" },
      { brand: "Valecore", referenceNumber: "VCA-2000" },
    ],
    replacementProductId: null,
    slugEn: "legacy-air-filter",
    slugZhCn: "历史空气滤清器",
    status: "discontinued",
    summaryEn:
      "Discontinued standard replacement air filter retained for historical identification.",
    summaryZhCn: "为历史识别保留的已停产标准替换空气滤清器。",
  }),
  productFixture({
    categoryCode: "air",
    id: "product-tq-af-2106",
    nameEn: "High-Capacity Air Filter",
    nameZhCn: "高容空气滤清器",
    partNumber: "TQ-AF-2106",
    publicationId: "publication-product-tq-af-2106-v1",
    references: [
      { brand: "Novera", referenceNumber: "NAF-2106" },
      { brand: "Arvento", referenceNumber: "ARV-4400" },
      { brand: "Branton", referenceNumber: "BRA-2106" },
    ],
    replacementProductId: null,
    slugEn: "high-capacity-air-filter",
    slugZhCn: "高容空气滤清器",
    status: "published",
    summaryEn:
      "Standard replacement air filter for selected commercial vehicle applications.",
    summaryZhCn: "适用于指定商用车型的标准替换空气滤清器。",
  }),
  productFixture({
    categoryCode: "cabin",
    id: "product-tq-cf-3021",
    nameEn: "Activated Carbon Cabin Filter",
    nameZhCn: "活性炭空调滤清器",
    partNumber: "TQ-CF-3021",
    publicationId: "publication-product-tq-cf-3021-v1",
    references: [
      { brand: "Valecore", referenceNumber: "VCF-3021" },
      { brand: "Arvento", referenceNumber: "ARV-4400" },
      { brand: "Novera", referenceNumber: "NCF-3021" },
    ],
    replacementProductId: null,
    slugEn: "activated-carbon-cabin-filter",
    slugZhCn: "活性炭空调滤清器",
    status: "published",
    summaryEn:
      "Standard replacement cabin filter with a demonstration carbon layer.",
    summaryZhCn: "带演示活性炭层的标准替换空调滤清器。",
  }),
  productFixture({
    categoryCode: "fuel",
    id: "product-tq-fl-4720",
    nameEn: "Legacy Fuel Filter",
    nameZhCn: "历史燃油滤清器",
    partNumber: "TQ-FL-4720",
    publicationId: "publication-product-tq-fl-4720-v1",
    references: [
      { brand: "Novera", referenceNumber: "NFL-4720" },
      { brand: "Arvento", referenceNumber: "AFL-4720" },
      { brand: "Branton", referenceNumber: "BFL-4720" },
    ],
    replacementProductId: "product-tq-fl-4827",
    slugEn: "legacy-fuel-filter",
    slugZhCn: "历史燃油滤清器",
    status: "discontinued",
    summaryEn:
      "Discontinued standard replacement fuel filter retained with its historical specifications.",
    summaryZhCn: "保留历史规格的已停产标准替换燃油滤清器。",
  }),
  productFixture({
    categoryCode: "fuel",
    id: "product-tq-fl-4827",
    nameEn: "High-Efficiency Fuel Filter",
    nameZhCn: "高效燃油滤清器",
    partNumber: "TQ-FL-4827",
    publicationId: "publication-product-tq-fl-4827-v1",
    references: [
      { brand: "Novera", referenceNumber: "NFX-9081" },
      { brand: "Arvento", referenceNumber: "ARV-7710" },
      { brand: "Valecore", referenceNumber: "TQ-AF-2106" },
    ],
    replacementProductId: null,
    slugEn: "high-efficiency-fuel-filter",
    slugZhCn: "高效燃油滤清器",
    status: "published",
    summaryEn:
      "Standard replacement fuel filter for selected commercial vehicle applications.",
    summaryZhCn: "适用于指定商用车型的标准替换燃油滤清器。",
  }),
  productFixture({
    categoryCode: "oil",
    id: "product-tq-of-1038",
    nameEn: "Spin-On Oil Filter",
    nameZhCn: "旋装式机油滤清器",
    partNumber: "TQ-OF-1038",
    publicationId: "publication-product-tq-of-1038-v1",
    references: [
      { brand: "Novera", referenceNumber: "NOF-1038" },
      { brand: "Branton", referenceNumber: "BRN-1038" },
      { brand: "Valecore", referenceNumber: "VOF-1038" },
    ],
    replacementProductId: null,
    slugEn: "spin-on-oil-filter",
    slugZhCn: "旋装式机油滤清器",
    status: "published",
    summaryEn:
      "Standard replacement spin-on oil filter for selected diesel engines.",
    summaryZhCn: "适用于指定柴油发动机的标准替换旋装式机油滤清器。",
  }),
  productFixture({
    categoryCode: "fuel",
    id: "product-tq-df-9000",
    nameEn: "Draft Fuel Filter",
    nameZhCn: "",
    partNumber: "TQ-DF-9000",
    publicationId: null,
    references: [
      { brand: "Novera", referenceNumber: "NDF-9000" },
      { brand: "Arvento", referenceNumber: "ADF-9000" },
      { brand: "Valecore", referenceNumber: "VDF-9000" },
    ],
    replacementProductId: null,
    slugEn: "draft-fuel-filter",
    slugZhCn: "草稿燃油滤清器",
    status: "draft",
  }),
];

const generatedProductSeries = [
  { categoryCode: "air" as const, count: 11, prefix: "AF", start: 2201 },
  { categoryCode: "oil" as const, count: 12, prefix: "OF", start: 1101 },
  { categoryCode: "fuel" as const, count: 9, prefix: "FL", start: 5201 },
  { categoryCode: "cabin" as const, count: 11, prefix: "CF", start: 3101 },
] as const;

const categoryNames = {
  air: { en: "Fleet Air Filter", zhCn: "车队空气滤清器" },
  cabin: { en: "Comfort Cabin Filter", zhCn: "舒适空调滤清器" },
  fuel: { en: "Fleet Fuel Filter", zhCn: "车队燃油滤清器" },
  oil: { en: "Fleet Oil Filter", zhCn: "车队机油滤清器" },
} as const;

const generatedProducts = generatedProductSeries.flatMap((series) =>
  Array.from({ length: series.count }, (_, index) => {
    const number = series.start + index;
    const partNumber = `TQ-${series.prefix}-${number}`;
    const productId = `product-${partNumber.toLowerCase()}`;
    const names = categoryNames[series.categoryCode];
    const referenceStem = `${series.prefix}-${number}`;

    return productFixture({
      categoryCode: series.categoryCode,
      id: productId,
      nameEn: `${names.en} ${number}`,
      nameZhCn: `${names.zhCn}${number}`,
      partNumber,
      publicationId: `publication-${productId}-v1`,
      references: [
        { brand: "Novera", referenceNumber: `NV-${referenceStem}` },
        { brand: "Branton", referenceNumber: `BR-${referenceStem}` },
        { brand: "Valecore", referenceNumber: `VC-${referenceStem}` },
      ],
      replacementProductId: null,
      status: "published",
    });
  }),
);

export const DEMO_CATALOG_PRODUCTS: readonly DemoCatalogProduct[] = [
  ...specialProducts,
  ...generatedProducts,
];

export const DEMO_PUBLISHED_PRODUCTS = DEMO_CATALOG_PRODUCTS.filter(
  (product) => product.publicationId !== null,
);

export const DEMO_DRAFT_PRODUCT = DEMO_CATALOG_PRODUCTS.find(
  ({ id }) => id === "product-tq-df-9000",
)!;

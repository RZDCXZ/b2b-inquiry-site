import type {
  MetricSpecificationUnit,
  SpecificationDataType,
} from "@/src/modules/catalog/public/specifications";

export const PRODUCT_IMPORT_SHEETS = [
  "产品",
  "翻译",
  "规格值",
  "参考号",
  "适配关系",
] as const;

export type ProductImportSheet = (typeof PRODUCT_IMPORT_SHEETS)[number];

export function formatProductImportBatchNumber(batchNumber: number): string {
  return `B-${String(batchNumber).padStart(3, "0")}`;
}

export const PRODUCT_IMPORT_COLUMNS = {
  产品: ["产品编号", "分类代码", "图片路径", "状态", "替代产品编号"],
  翻译: [
    "产品编号",
    "语言",
    "产品名称",
    "URL别名",
    "短描述",
    "详细描述",
    "SEO标题",
    "SEO描述",
    "图片替代文本",
    "适配摘要",
  ],
  规格值: ["产品编号", "属性代码", "值", "单位"],
  参考号: ["产品编号", "品牌", "参考号"],
  适配关系: ["产品编号", "车辆品牌", "车型", "发动机", "起始年份", "结束年份"],
} satisfies Record<ProductImportSheet, readonly string[]>;

export type ProductImportErrorCode =
  | "CATEGORY_NOT_FOUND"
  | "COLUMN_MISSING"
  | "FIELD_INVALID"
  | "FIELD_REQUIRED"
  | "FILE_EMPTY"
  | "FILE_SIGNATURE_INVALID"
  | "FILE_TOO_LARGE"
  | "FILE_TYPE_INVALID"
  | "FITMENT_DUPLICATE"
  | "FITMENT_NOT_FOUND"
  | "FITMENT_YEAR_RANGE_INVALID"
  | "PRODUCT_DRAFT_MISSING"
  | "PRODUCT_NUMBER_DUPLICATE"
  | "PRODUCT_ROW_MISSING"
  | "REFERENCE_DUPLICATE"
  | "REPLACEMENT_INVALID"
  | "REPLACEMENT_NOT_FOUND"
  | "ROW_LIMIT_EXCEEDED"
  | "SHEET_MISSING"
  | "SPECIFICATION_ATTRIBUTE_DUPLICATE"
  | "SPECIFICATION_ATTRIBUTE_MISSING"
  | "SPECIFICATION_ATTRIBUTE_NOT_FOUND"
  | "SPECIFICATION_UNIT_INVALID"
  | "SPECIFICATION_VALUE_INVALID"
  | "TRANSLATION_DUPLICATE"
  | "TRANSLATION_MISSING"
  | "WORKBOOK_PARSE_FAILED";

export type ProductImportError = {
  code: ProductImportErrorCode;
  field: string;
  issue: string;
  row: number;
  sheet: ProductImportSheet | "工作簿";
  suggestion: string;
};

export type ProductImportSpecificationSnapshot = {
  attributeCode: string;
  attributeId: string;
  baseUnit: MetricSpecificationUnit | null;
  booleanValue: boolean | null;
  dataType: SpecificationDataType;
  decimalValue: number | null;
  enumerationLabelEn: string | null;
  enumerationLabelZhCn: string | null;
  enumerationValue: string | null;
  nameEn: string;
  nameZhCn: string;
  position: number;
  textValue: string | null;
};

export type ProductImportTranslation = {
  description: string;
  fitmentSummary: string;
  imageAlt: string;
  name: string;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  summary: string;
};

export type ProductImportChange = {
  after: string;
  before: string;
  field: string;
};

export type ProductImportPayloadProduct = {
  baselineCurrentPublicationId: string | null;
  baselineDraftVersion: number | null;
  baselineLastPublishedVersion: number | null;
  baselineNameZhCn: string | null;
  baselineProductId: string | null;
  categoryId: string;
  categoryNameZhCn: string;
  changeKind: "add" | "update";
  changes: ProductImportChange[];
  fitments: Array<{
    engineId: string;
    vehicleModelId: string;
    yearFrom: number;
    yearTo: number;
  }>;
  imagePath: string;
  partNumber: string;
  references: Array<{ brand: string; referenceNumber: string }>;
  replacementPartNumber: string | null;
  specifications: ProductImportSpecificationSnapshot[];
  status: "discontinued" | "published";
  translations: {
    en: ProductImportTranslation;
    zhCn: ProductImportTranslation;
  };
};

export type ProductImportPayload = {
  catalogFingerprint: string;
  products: ProductImportPayloadProduct[];
};

export type ProductImportPreviewView = {
  addedCount: number;
  affectedProductCount: number;
  canConfirm: boolean;
  createdAt: Date;
  errors: ProductImportError[];
  id: string;
  originalFilename: string;
  products: ProductImportPayloadProduct[];
  status: "confirmed" | "pending";
  updatedCount: number;
};

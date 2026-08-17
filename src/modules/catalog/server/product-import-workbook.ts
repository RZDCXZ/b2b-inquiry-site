import { createHash } from "node:crypto";

import ExcelJS from "exceljs";
import { z } from "zod";

import { normalizeProductNumber } from "@/src/modules/catalog/public/product-identity";
import {
  PRODUCT_IMPORT_COLUMNS,
  PRODUCT_IMPORT_SHEETS,
  type ProductImportError,
  type ProductImportPayload,
  type ProductImportPayloadProduct,
  type ProductImportSheet,
  type ProductImportSpecificationSnapshot,
  type ProductImportTranslation,
} from "@/src/modules/catalog/public/product-import";
import type { SpecificationAttributeDefinition } from "@/src/modules/catalog/public/specifications";
import { validateRestrictedRichText } from "@/src/modules/content-publishing/public/restricted-rich-text";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS_PER_SHEET = 5_000;
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ALLOWED_MIME_TYPES = new Set([XLSX_MIME, "application/octet-stream"]);

export type ProductImportCatalogContext = {
  categories: Array<{
    code: string;
    id: string;
    nameZhCn: string;
    specificationAttributes: SpecificationAttributeDefinition[];
  }>;
  engines: Array<{
    code: string;
    id: string;
    makeName: string;
    modelName: string;
    vehicleModelId: string;
  }>;
  existingProducts: Array<{
    currentPublicationId: string | null;
    draftLastPublishedVersion: number | null;
    draftVersion: number | null;
    draftNameZhCn: string | null;
    draftReplacementNormalizedPartNumber: string | null;
    id: string;
    normalizedPartNumber: string;
    partNumber: string;
  }>;
};

type ReplacementGraphProduct = {
  partNumber: string;
  replacementPartNumber: string | null;
};

function productImportReplacementGraph(
  context: ProductImportCatalogContext,
  products: ReplacementGraphProduct[],
): Map<string, string | null> {
  const replacementByNumber = new Map(
    context.existingProducts.map((product) => [
      product.normalizedPartNumber,
      product.draftReplacementNormalizedPartNumber,
    ]),
  );
  for (const product of products) {
    replacementByNumber.set(
      normalizeProductNumber(product.partNumber),
      product.replacementPartNumber
        ? normalizeProductNumber(product.replacementPartNumber)
        : null,
    );
  }
  return replacementByNumber;
}

export function cyclicProductImportReplacementNumbers(
  context: ProductImportCatalogContext,
  products: ReplacementGraphProduct[],
): Set<string> {
  const replacementByNumber = productImportReplacementGraph(context, products);

  const cyclicSources = new Set<string>();
  for (const product of products) {
    const source = normalizeProductNumber(product.partNumber);
    if (!replacementByNumber.get(source)) continue;
    const visited = new Set<string>();
    let candidate = replacementByNumber.get(source) ?? null;
    while (candidate) {
      if (candidate === source || visited.has(candidate)) {
        cyclicSources.add(source);
        break;
      }
      visited.add(candidate);
      candidate = replacementByNumber.get(candidate) ?? null;
    }
  }
  return cyclicSources;
}

export function productImportReplacementGraphFingerprint(
  context: ProductImportCatalogContext,
  products: ReplacementGraphProduct[],
): string {
  const replacementByNumber = productImportReplacementGraph(context, products);
  const paths = products
    .filter(({ replacementPartNumber }) => replacementPartNumber)
    .map((product) => {
      const source = normalizeProductNumber(product.partNumber);
      const target = replacementByNumber.get(source) ?? null;
      const chain: Array<[string, string | null]> = [];
      const visited = new Set<string>();
      let candidate = target;
      while (candidate && !visited.has(candidate)) {
        visited.add(candidate);
        const next = replacementByNumber.get(candidate) ?? null;
        chain.push([candidate, next]);
        candidate = next;
      }
      return { chain, source, target };
    })
    .sort((left, right) => left.source.localeCompare(right.source));

  return createHash("sha256").update(JSON.stringify(paths)).digest("hex");
}

export type ProductImportFile = {
  bytes: Uint8Array;
  declaredMimeType: string;
  originalFilename: string;
};

const fieldDescriptions = [
  ["工作表", "字段", "必填", "说明", "示例"],
  [
    "导入规则",
    "受影响范围",
    "—",
    "只有“产品”工作表出现的产品会变化；这些产品在其余四表中的行会作为完整集合替换对应草稿关系。",
    "未出现产品保持不变",
  ],
  [
    "导入规则",
    "公开状态",
    "—",
    "状态列表示草稿准备发布的目标状态；确认导入只更新草稿，不会改变当前公开版本。",
    "导入后仍需预览并发布",
  ],
  [
    "产品",
    "产品编号",
    "是",
    "跨工作表稳定身份键；存在则更新草稿，不存在则新增草稿。",
    "TQ-FL-4827",
  ],
  ["产品", "分类代码", "是", "必须匹配系统已有单层分类代码。", "fuel"],
  [
    "产品",
    "图片路径",
    "是",
    "站内产品图片路径。",
    "/assets/fuel-filter-product.png",
  ],
  [
    "产品",
    "状态",
    "是",
    "可填写 published 或 discontinued；导入不会自动公开。",
    "published",
  ],
  [
    "产品",
    "替代产品编号",
    "否",
    "仅已停产产品可填，目标产品必须已存在、已有公开版本且不能形成替代环。",
    "TQ-FL-4828",
  ],
  [
    "翻译",
    "产品编号",
    "是",
    "必须对应“产品”工作表中的产品编号。",
    "TQ-FL-4827",
  ],
  ["翻译", "语言", "是", "每个产品必须各有一行 en 与 zh-cn。", "en"],
  [
    "翻译",
    "产品名称",
    "是",
    "当前语言的产品名称。",
    "High-Efficiency Fuel Filter",
  ],
  [
    "翻译",
    "URL别名",
    "是",
    "当前语言的稳定 URL 别名。",
    "high-efficiency-fuel-filter",
  ],
  ["翻译", "短描述", "是", "产品列表与详情摘要。", "Demo replacement filter."],
  [
    "翻译",
    "详细描述",
    "是",
    "受限富文本产品说明。",
    "Demonstration product description.",
  ],
  ["翻译", "SEO标题", "是", "当前语言的 SEO 标题。", "Fuel Filter | Torquelis"],
  ["翻译", "SEO描述", "是", "当前语言的 SEO 描述。", "Demonstration product."],
  [
    "翻译",
    "图片替代文本",
    "是",
    "当前语言的图片替代文本。",
    "Demonstration fuel filter",
  ],
  [
    "翻译",
    "适配摘要",
    "是",
    "当前语言的适配概述。",
    "Selected commercial vehicles.",
  ],
  [
    "规格值",
    "产品编号",
    "是",
    "必须对应“产品”工作表中的产品编号。",
    "TQ-FL-4827",
  ],
  [
    "规格值",
    "属性代码",
    "是",
    "必须属于产品分类定义的规格属性。",
    "outer_diameter",
  ],
  [
    "规格值",
    "值",
    "是",
    "按属性的数据类型填写布尔值、数值、枚举代码或文本。",
    "98",
  ],
  [
    "规格值",
    "单位",
    "数值时",
    "数值规格必须使用属性定义的公制基准单位。",
    "millimetre",
  ],
  [
    "参考号",
    "产品编号",
    "是",
    "必须对应“产品”工作表中的产品编号。",
    "TQ-FL-4827",
  ],
  ["参考号", "品牌", "是", "虚构参考号品牌。", "Novera"],
  ["参考号", "参考号", "是", "同一产品与品牌下不能重复。", "NDF-4827"],
  [
    "适配关系",
    "产品编号",
    "是",
    "必须对应“产品”工作表中的产品编号。",
    "TQ-FL-4827",
  ],
  ["适配关系", "车辆品牌", "是", "必须匹配系统已有车辆品牌。", "Northline"],
  ["适配关系", "车型", "是", "必须属于所填车辆品牌。", "HX9"],
  ["适配关系", "发动机", "是", "必须属于所填车型。", "N13-420"],
  ["适配关系", "起始年份", "是", "四位年份，不得晚于结束年份。", "2020"],
  ["适配关系", "结束年份", "是", "四位年份，不得早于起始年份。", "2026"],
];

const productSchema = z.object({
  categoryCode: z.string().trim().min(1).max(100),
  imagePath: z.string().trim().min(1).max(500),
  partNumber: z.string().trim().min(1).max(80),
  replacementPartNumber: z.string().trim().max(80),
  status: z.enum(["published", "discontinued"]),
});

const translationSchema = z.object({
  description: z.string().trim().min(1).max(8_000),
  fitmentSummary: z.string().trim().min(1).max(2_000),
  imageAlt: z.string().trim().min(1).max(300),
  locale: z.enum(["en", "zh-cn"]),
  name: z.string().trim().min(1).max(200),
  partNumber: z.string().trim().min(1).max(80),
  seoDescription: z.string().trim().min(1).max(500),
  seoTitle: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(2_000),
});

const specificationRowSchema = z.object({
  attributeCode: z.string().trim().min(1).max(100),
  partNumber: z.string().trim().min(1).max(80),
  unit: z.string().trim().max(100),
  value: z.string().trim().max(500),
});

const referenceRowSchema = z.object({
  brand: z.string().trim().min(1).max(200),
  partNumber: z.string().trim().min(1).max(80),
  referenceNumber: z.string().trim().min(1).max(200),
});

const fitmentRowSchema = z.object({
  engineCode: z.string().trim().min(1).max(100),
  make: z.string().trim().min(1).max(200),
  model: z.string().trim().min(1).max(200),
  partNumber: z.string().trim().min(1).max(80),
  yearFrom: z.string().trim().max(4),
  yearTo: z.string().trim().max(4),
});

function styleWorksheet(worksheet: ExcelJS.Worksheet) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { column: 1, row: 1 },
    to: { column: worksheet.columnCount, row: 1 },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    fgColor: { argb: "FF10283D" },
    pattern: "solid",
    type: "pattern",
  };
  worksheet.columns.forEach((column) => {
    column.width = 24;
  });
}

export async function createProductImportWorkbook(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Torquelis Filters";
  workbook.created = new Date("2026-08-15T00:00:00.000Z");

  for (const sheetName of PRODUCT_IMPORT_SHEETS) {
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.addRow(PRODUCT_IMPORT_COLUMNS[sheetName]);
    styleWorksheet(worksheet);
  }

  const dictionary = workbook.addWorksheet("字段说明");
  dictionary.addRows(fieldDescriptions);
  styleWorksheet(dictionary);
  dictionary.getColumn(4).width = 64;
  dictionary.getColumn(5).width = 36;

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

function addError(errors: ProductImportError[], error: ProductImportError) {
  errors.push(error);
}

function fileErrors(file: ProductImportFile): ProductImportError[] {
  const errors: ProductImportError[] = [];
  const fileError = (
    code: ProductImportError["code"],
    issue: string,
    suggestion: string,
  ) =>
    addError(errors, {
      code,
      field: "文件",
      issue,
      row: 0,
      sheet: "工作簿",
      suggestion,
    });

  if (file.bytes.byteLength === 0) {
    fileError(
      "FILE_EMPTY",
      "上传的文件为空。",
      "重新选择包含数据的 .xlsx 工作簿。",
    );
  }
  if (file.bytes.byteLength > MAX_FILE_BYTES) {
    fileError(
      "FILE_TOO_LARGE",
      "工作簿超过 5 MiB 限制。",
      "移除无关图片、格式或工作表后重新上传。",
    );
  }
  if (!file.originalFilename.toLocaleLowerCase().endsWith(".xlsx")) {
    fileError(
      "FILE_TYPE_INVALID",
      "文件扩展名不是 .xlsx。",
      "使用下载模板生成 .xlsx 文件。",
    );
  }
  if (!ALLOWED_MIME_TYPES.has(file.declaredMimeType)) {
    fileError(
      "FILE_TYPE_INVALID",
      "文件声明类型不是 Excel 工作簿。",
      "使用 Excel 或兼容软件另存为 .xlsx。",
    );
  }
  if (
    file.bytes.byteLength >= 2 &&
    (file.bytes[0] !== 0x50 || file.bytes[1] !== 0x4b)
  ) {
    fileError(
      "FILE_SIGNATURE_INVALID",
      "文件签名不是有效的 .xlsx 容器。",
      "不要仅修改扩展名，请重新导出工作簿。",
    );
  }

  return errors;
}

type RowRecord = { row: number; values: Record<string, string> };

function worksheetRows(
  worksheet: ExcelJS.Worksheet | undefined,
  sheet: ProductImportSheet,
  errors: ProductImportError[],
): RowRecord[] {
  if (!worksheet) {
    addError(errors, {
      code: "SHEET_MISSING",
      field: "工作表",
      issue: `缺少“${sheet}”工作表。`,
      row: 0,
      sheet,
      suggestion: "从系统重新下载模板，并保留五个业务工作表的原始名称。",
    });
    return [];
  }

  if (worksheet.actualRowCount - 1 > MAX_ROWS_PER_SHEET) {
    addError(errors, {
      code: "ROW_LIMIT_EXCEEDED",
      field: "工作表",
      issue: `数据行超过 ${MAX_ROWS_PER_SHEET} 行限制。`,
      row: 0,
      sheet,
      suggestion: "拆分为多个导入批次后重新上传。",
    });
  }

  const headerIndex = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, column) => {
    headerIndex.set(cell.text.trim(), column);
  });
  for (const field of PRODUCT_IMPORT_COLUMNS[sheet]) {
    if (!headerIndex.has(field)) {
      addError(errors, {
        code: "COLUMN_MISSING",
        field,
        issue: `缺少“${field}”列。`,
        row: 1,
        sheet,
        suggestion: "从系统重新下载模板，并保留表头名称。",
      });
    }
  }

  const rows: RowRecord[] = [];
  const lastRow = Math.min(worksheet.actualRowCount, MAX_ROWS_PER_SHEET + 1);
  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (!row.hasValues) continue;
    const values = Object.fromEntries(
      PRODUCT_IMPORT_COLUMNS[sheet].map((field) => [
        field,
        headerIndex.has(field)
          ? row.getCell(headerIndex.get(field)!).text.trim()
          : "",
      ]),
    );
    if (Object.values(values).every((value) => value === "")) continue;
    rows.push({ row: rowNumber, values });
  }
  return rows;
}

function zodRowErrors({
  error,
  fieldNames,
  row,
  sheet,
}: {
  error: z.ZodError;
  fieldNames: Record<string, string>;
  row: number;
  sheet: ProductImportSheet;
}): ProductImportError[] {
  return error.issues.map((issue) => {
    const field = fieldNames[String(issue.path[0])] ?? String(issue.path[0]);
    const missing = issue.code === "too_small";
    return {
      code: missing ? "FIELD_REQUIRED" : "FIELD_INVALID",
      field,
      issue: missing ? `“${field}”不能为空。` : `“${field}”格式或长度无效。`,
      row,
      sheet,
      suggestion: "按模板“字段说明”工作表中的格式修正该值。",
    };
  });
}

function parseBoolean(value: string): boolean | null {
  if (["true", "yes", "1", "是"].includes(value.toLocaleLowerCase()))
    return true;
  if (["false", "no", "0", "否"].includes(value.toLocaleLowerCase()))
    return false;
  return null;
}

export async function parseProductImportWorkbook({
  context,
  file,
}: {
  context: ProductImportCatalogContext;
  file: ProductImportFile;
}): Promise<{
  errors: ProductImportError[];
  payload: ProductImportPayload;
  summary: {
    addedCount: number;
    affectedProductCount: number;
    updatedCount: number;
  };
}> {
  const errors = fileErrors(file);
  const payload: ProductImportPayload = {
    catalogFingerprint: productImportCatalogFingerprint(context),
    products: [],
    replacementGraphFingerprint: "",
  };
  const emptySummary = {
    addedCount: 0,
    affectedProductCount: 0,
    updatedCount: 0,
  };
  if (errors.some(({ code }) => code.startsWith("FILE_"))) {
    return { errors, payload, summary: emptySummary };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file.bytes as never);
  } catch {
    addError(errors, {
      code: "WORKBOOK_PARSE_FAILED",
      field: "文件",
      issue: "无法读取工作簿内容。",
      row: 0,
      sheet: "工作簿",
      suggestion: "使用系统模板重新生成 .xlsx 文件后上传。",
    });
    return { errors, payload, summary: emptySummary };
  }

  const rows = Object.fromEntries(
    PRODUCT_IMPORT_SHEETS.map((sheet) => [
      sheet,
      worksheetRows(workbook.getWorksheet(sheet), sheet, errors),
    ]),
  ) as Record<ProductImportSheet, RowRecord[]>;
  if (rows["产品"].length === 0) {
    addError(errors, {
      code: "FIELD_REQUIRED",
      field: "产品编号",
      issue: "产品工作表没有可导入的数据行。",
      row: 2,
      sheet: "产品",
      suggestion: "至少添加一行包含产品编号的产品主记录。",
    });
  }
  const categoryByCode = new Map(
    context.categories.map((item) => [item.code, item]),
  );
  const existingByNumber = new Map(
    context.existingProducts.map((item) => [item.normalizedPartNumber, item]),
  );

  type ProductSource = z.infer<typeof productSchema> & {
    category: ProductImportCatalogContext["categories"][number];
    existing: ProductImportCatalogContext["existingProducts"][number] | null;
    normalizedPartNumber: string;
    row: number;
  };
  const productByNumber = new Map<string, ProductSource>();
  const seenProductNumbers = new Set<string>();
  for (const source of rows["产品"]) {
    const rawPartNumber = source.values["产品编号"];
    const rawNormalizedPartNumber = normalizeProductNumber(rawPartNumber);
    const duplicate =
      rawNormalizedPartNumber.length > 0 &&
      seenProductNumbers.has(rawNormalizedPartNumber);
    if (duplicate) {
      addError(errors, {
        code: "PRODUCT_NUMBER_DUPLICATE",
        field: "产品编号",
        issue: `产品编号“${rawPartNumber}”在产品工作表中重复。`,
        row: source.row,
        sheet: "产品",
        suggestion: "每个产品编号只保留一行产品主记录。",
      });
    }
    if (rawNormalizedPartNumber) {
      seenProductNumbers.add(rawNormalizedPartNumber);
    }
    const parsed = productSchema.safeParse({
      categoryCode: source.values["分类代码"],
      imagePath: source.values["图片路径"],
      partNumber: source.values["产品编号"],
      replacementPartNumber: source.values["替代产品编号"],
      status: source.values["状态"],
    });
    if (!parsed.success) {
      errors.push(
        ...zodRowErrors({
          error: parsed.error,
          fieldNames: {
            categoryCode: "分类代码",
            imagePath: "图片路径",
            partNumber: "产品编号",
            replacementPartNumber: "替代产品编号",
            status: "状态",
          },
          row: source.row,
          sheet: "产品",
        }),
      );
      continue;
    }
    const normalizedPartNumber = normalizeProductNumber(parsed.data.partNumber);
    if (!normalizedPartNumber) continue;
    const category = categoryByCode.get(parsed.data.categoryCode);
    if (!category) {
      addError(errors, {
        code: "CATEGORY_NOT_FOUND",
        field: "分类代码",
        issue: `分类代码“${parsed.data.categoryCode}”不存在。`,
        row: source.row,
        sheet: "产品",
        suggestion: "填写系统分类列表中已有的分类代码。",
      });
      continue;
    }
    const existing = existingByNumber.get(normalizedPartNumber) ?? null;
    if (existing && existing.draftVersion === null) {
      addError(errors, {
        code: "PRODUCT_DRAFT_MISSING",
        field: "产品编号",
        issue: `产品“${existing.partNumber}”没有可更新的草稿。`,
        row: source.row,
        sheet: "产品",
        suggestion: "先在产品后台创建草稿，再重新预览。",
      });
      continue;
    }
    if (duplicate) continue;
    productByNumber.set(normalizedPartNumber, {
      ...parsed.data,
      category,
      existing,
      normalizedPartNumber,
      row: source.row,
    });
  }

  const translations = new Map<
    string,
    Partial<Record<"en" | "zhCn", ProductImportTranslation>>
  >();
  const seenTranslationKeys = new Set<string>();
  for (const source of rows["翻译"]) {
    const rawPartNumber = source.values["产品编号"];
    const rawLocale = source.values["语言"].toLocaleLowerCase();
    const rawNormalizedPartNumber = normalizeProductNumber(rawPartNumber);
    const translationKey = `${rawNormalizedPartNumber}::${rawLocale}`;
    const duplicate =
      rawNormalizedPartNumber.length > 0 &&
      rawLocale.length > 0 &&
      seenTranslationKeys.has(translationKey);
    if (duplicate) {
      addError(errors, {
        code: "TRANSLATION_DUPLICATE",
        field: "语言",
        issue: `产品“${rawPartNumber}”的 ${rawLocale} 翻译重复。`,
        row: source.row,
        sheet: "翻译",
        suggestion: "每个产品编号与语言组合只保留一行。",
      });
    }
    if (rawNormalizedPartNumber && rawLocale) {
      seenTranslationKeys.add(translationKey);
    }
    const richText = validateRestrictedRichText(source.values["详细描述"]);
    if (!richText.success) {
      addError(errors, {
        code: "FIELD_INVALID",
        field: "详细描述",
        issue: richText.issues.join("；"),
        row: source.row,
        sheet: "翻译",
        suggestion: "只使用允许的标题、段落、列表、链接、图片和强调格式。",
      });
    }
    const parsed = translationSchema.safeParse({
      description: source.values["详细描述"],
      fitmentSummary: source.values["适配摘要"],
      imageAlt: source.values["图片替代文本"],
      locale: source.values["语言"],
      name: source.values["产品名称"],
      partNumber: source.values["产品编号"],
      seoDescription: source.values["SEO描述"],
      seoTitle: source.values["SEO标题"],
      slug: source.values["URL别名"],
      summary: source.values["短描述"],
    });
    if (!parsed.success) {
      errors.push(
        ...zodRowErrors({
          error: parsed.error,
          fieldNames: {
            description: "详细描述",
            fitmentSummary: "适配摘要",
            imageAlt: "图片替代文本",
            locale: "语言",
            name: "产品名称",
            partNumber: "产品编号",
            seoDescription: "SEO描述",
            seoTitle: "SEO标题",
            slug: "URL别名",
            summary: "短描述",
          },
          row: source.row,
          sheet: "翻译",
        }),
      );
      continue;
    }
    const normalized = normalizeProductNumber(parsed.data.partNumber);
    const locale = parsed.data.locale === "en" ? "en" : "zhCn";
    const productExists = productByNumber.has(normalized);
    if (!productExists) {
      addError(errors, {
        code: "PRODUCT_ROW_MISSING",
        field: "产品编号",
        issue: `产品编号“${parsed.data.partNumber}”没有对应的产品主记录。`,
        row: source.row,
        sheet: "翻译",
        suggestion: "在“产品”工作表中添加该产品编号，或删除这条孤立记录。",
      });
    }
    if (duplicate || !richText.success || !productExists) continue;
    const localized = translations.get(normalized) ?? {};
    const translation: ProductImportTranslation = {
      description: parsed.data.description,
      fitmentSummary: parsed.data.fitmentSummary,
      imageAlt: parsed.data.imageAlt,
      name: parsed.data.name,
      seoDescription: parsed.data.seoDescription,
      seoTitle: parsed.data.seoTitle,
      slug: parsed.data.slug,
      summary: parsed.data.summary,
    };
    localized[locale] = translation;
    translations.set(normalized, localized);
  }

  const specifications = new Map<
    string,
    ProductImportSpecificationSnapshot[]
  >();
  const seenSpecificationKeys = new Set<string>();
  for (const source of rows["规格值"]) {
    const parsed = specificationRowSchema.safeParse({
      attributeCode: source.values["属性代码"],
      partNumber: source.values["产品编号"],
      unit: source.values["单位"],
      value: source.values["值"],
    });
    if (!parsed.success) {
      errors.push(
        ...zodRowErrors({
          error: parsed.error,
          fieldNames: {
            attributeCode: "属性代码",
            partNumber: "产品编号",
            unit: "单位",
            value: "值",
          },
          row: source.row,
          sheet: "规格值",
        }),
      );
    }
    const partNumber = source.values["产品编号"];
    const normalized = normalizeProductNumber(partNumber);
    const product = productByNumber.get(normalized);
    if (!product) {
      addError(errors, {
        code: "PRODUCT_ROW_MISSING",
        field: "产品编号",
        issue: `产品编号“${partNumber}”没有对应的产品主记录。`,
        row: source.row,
        sheet: "规格值",
        suggestion: "在“产品”工作表中添加该产品编号，或删除这条孤立记录。",
      });
      continue;
    }
    const attributeCode = source.values["属性代码"];
    if (!attributeCode) continue;
    const key = `${normalized}::${attributeCode}`;
    const duplicate = seenSpecificationKeys.has(key);
    if (duplicate) {
      addError(errors, {
        code: "SPECIFICATION_ATTRIBUTE_DUPLICATE",
        field: "属性代码",
        issue: `规格属性“${attributeCode}”在该产品中重复。`,
        row: source.row,
        sheet: "规格值",
        suggestion: "每个产品与属性代码组合只保留一行。",
      });
    }
    seenSpecificationKeys.add(key);
    const definition = product.category.specificationAttributes.find(
      ({ code }) => code === attributeCode,
    );
    if (!definition) {
      addError(errors, {
        code: "SPECIFICATION_ATTRIBUTE_NOT_FOUND",
        field: "属性代码",
        issue: `属性“${attributeCode}”不属于分类“${product.category.code}”。`,
        row: source.row,
        sheet: "规格值",
        suggestion: "使用该分类属性定义中已有的属性代码。",
      });
      continue;
    }
    const unit = source.values["单位"] || undefined;
    const unitInvalid = unit !== (definition.baseUnit ?? undefined);
    if (unitInvalid) {
      addError(errors, {
        code: "SPECIFICATION_UNIT_INVALID",
        field: "单位",
        issue: definition.baseUnit
          ? `属性“${attributeCode}”必须使用单位“${definition.baseUnit}”。`
          : `属性“${attributeCode}”不接受单位。`,
        row: source.row,
        sheet: "规格值",
        suggestion: definition.baseUnit
          ? `填写 ${definition.baseUnit}。`
          : "清空单位单元格。",
      });
    }
    const rawValue = source.values["值"];
    let decimalValue: number | null = null;
    let booleanValue: boolean | null = null;
    let enumerationValue: string | null = null;
    let textValue: string | null = null;
    let invalid = false;
    if (definition.dataType === "decimal") {
      decimalValue = Number(rawValue);
      invalid =
        rawValue === "" ||
        !Number.isFinite(decimalValue) ||
        decimalValue < definition.minimumDecimalValue! ||
        decimalValue > definition.maximumDecimalValue!;
    } else if (definition.dataType === "boolean") {
      booleanValue = parseBoolean(rawValue);
      invalid = booleanValue === null;
    } else if (definition.dataType === "enumeration") {
      enumerationValue = rawValue;
      invalid = !definition.options.some(({ code }) => code === rawValue);
    } else {
      textValue = rawValue.trim();
      invalid = textValue.length === 0;
    }
    if (invalid) {
      addError(errors, {
        code: "SPECIFICATION_VALUE_INVALID",
        field: "值",
        issue: `属性“${attributeCode}”的值不符合 ${definition.dataType} 类型或范围。`,
        row: source.row,
        sheet: "规格值",
        suggestion: "按分类属性定义的数据类型、范围或选项修正该值。",
      });
    }
    if (!parsed.success || duplicate || unitInvalid || invalid) continue;
    const option = definition.options.find(
      ({ code }) => code === enumerationValue,
    );
    const snapshots = specifications.get(normalized) ?? [];
    snapshots.push({
      attributeCode,
      attributeId: definition.id,
      baseUnit: definition.baseUnit,
      booleanValue,
      dataType: definition.dataType,
      decimalValue,
      enumerationLabelEn: option?.labelEn ?? null,
      enumerationLabelZhCn: option?.labelZhCn ?? null,
      enumerationValue,
      nameEn: definition.nameEn,
      nameZhCn: definition.nameZhCn,
      position: definition.position,
      textValue,
    });
    specifications.set(normalized, snapshots);
  }

  const references = new Map<
    string,
    Array<{ brand: string; referenceNumber: string }>
  >();
  const seenReferenceKeys = new Set<string>();
  for (const source of rows["参考号"]) {
    const partNumber = source.values["产品编号"];
    const rawBrand = source.values["品牌"];
    const rawReferenceNumber = source.values["参考号"];
    const normalized = normalizeProductNumber(partNumber);
    const normalizedReferenceNumber =
      normalizeProductNumber(rawReferenceNumber);
    const rawKey =
      normalized && rawBrand && normalizedReferenceNumber
        ? `${normalized}::${rawBrand.toLocaleLowerCase()}::${normalizedReferenceNumber}`
        : null;
    const duplicate = rawKey !== null && seenReferenceKeys.has(rawKey);
    if (duplicate) {
      addError(errors, {
        code: "REFERENCE_DUPLICATE",
        field: "参考号",
        issue: "同一产品与品牌下的参考号重复。",
        row: source.row,
        sheet: "参考号",
        suggestion: "删除重复参考号记录。",
      });
    }
    if (rawKey) seenReferenceKeys.add(rawKey);
    const parsed = referenceRowSchema.safeParse({
      brand: rawBrand,
      partNumber,
      referenceNumber: rawReferenceNumber,
    });
    if (!parsed.success) {
      errors.push(
        ...zodRowErrors({
          error: parsed.error,
          fieldNames: {
            brand: "品牌",
            partNumber: "产品编号",
            referenceNumber: "参考号",
          },
          row: source.row,
          sheet: "参考号",
        }),
      );
    }
    if (!productByNumber.has(normalized)) {
      addError(errors, {
        code: "PRODUCT_ROW_MISSING",
        field: "产品编号",
        issue: `产品编号“${partNumber}”没有对应的产品主记录。`,
        row: source.row,
        sheet: "参考号",
        suggestion: "在“产品”工作表中添加该产品编号，或删除这条孤立记录。",
      });
      continue;
    }
    if (!parsed.success || duplicate) continue;
    const { brand, referenceNumber } = parsed.data;
    const values = references.get(normalized) ?? [];
    values.push({ brand, referenceNumber });
    references.set(normalized, values);
  }

  const engineByIdentity = new Map(
    context.engines.map((engine) => [
      `${engine.makeName.toLocaleLowerCase()}::${engine.modelName.toLocaleLowerCase()}::${engine.code.toLocaleLowerCase()}`,
      engine,
    ]),
  );
  const fitments = new Map<string, ProductImportPayloadProduct["fitments"]>();
  const seenFitmentKeys = new Set<string>();
  for (const source of rows["适配关系"]) {
    const parsed = fitmentRowSchema.safeParse({
      engineCode: source.values["发动机"],
      make: source.values["车辆品牌"],
      model: source.values["车型"],
      partNumber: source.values["产品编号"],
      yearFrom: source.values["起始年份"],
      yearTo: source.values["结束年份"],
    });
    if (!parsed.success) {
      errors.push(
        ...zodRowErrors({
          error: parsed.error,
          fieldNames: {
            engineCode: "发动机",
            make: "车辆品牌",
            model: "车型",
            partNumber: "产品编号",
            yearFrom: "起始年份",
            yearTo: "结束年份",
          },
          row: source.row,
          sheet: "适配关系",
        }),
      );
    }
    const partNumber = source.values["产品编号"];
    const normalized = normalizeProductNumber(partNumber);
    const productExists = productByNumber.has(normalized);
    if (!productExists) {
      addError(errors, {
        code: "PRODUCT_ROW_MISSING",
        field: "产品编号",
        issue: `产品编号“${partNumber}”没有对应的产品主记录。`,
        row: source.row,
        sheet: "适配关系",
        suggestion: "在“产品”工作表中添加该产品编号，或删除这条孤立记录。",
      });
    }
    const make = source.values["车辆品牌"];
    const model = source.values["车型"];
    const engineCode = source.values["发动机"];
    const engine = engineByIdentity.get(
      `${make.toLocaleLowerCase()}::${model.toLocaleLowerCase()}::${engineCode.toLocaleLowerCase()}`,
    );
    if (!engine) {
      addError(errors, {
        code: "FITMENT_NOT_FOUND",
        field: "发动机",
        issue: `找不到“${make} / ${model} / ${engineCode}”适配组合。`,
        row: source.row,
        sheet: "适配关系",
        suggestion: "使用系统车辆、车型和发动机列表中的完整组合。",
      });
    }
    const yearFrom = Number(source.values["起始年份"]);
    const yearTo = Number(source.values["结束年份"]);
    const yearsValid =
      Number.isInteger(yearFrom) &&
      Number.isInteger(yearTo) &&
      yearFrom >= 1900 &&
      yearTo <= 2200 &&
      yearFrom <= yearTo;
    if (!yearsValid) {
      addError(errors, {
        code: "FITMENT_YEAR_RANGE_INVALID",
        field: "起始年份 / 结束年份",
        issue: "适配年份必须在 1900–2200 之间，且起始年份不得晚于结束年份。",
        row: source.row,
        sheet: "适配关系",
        suggestion: "修正为有效的四位年份范围。",
      });
    }
    if (!parsed.success || !productExists || !engine || !yearsValid) continue;
    const key = `${normalized}::${engine.id}::${yearFrom}::${yearTo}`;
    if (seenFitmentKeys.has(key)) {
      addError(errors, {
        code: "FITMENT_DUPLICATE",
        field: "适配关系",
        issue: "相同车辆、发动机和年份范围的适配关系重复。",
        row: source.row,
        sheet: "适配关系",
        suggestion: "删除重复适配记录。",
      });
      continue;
    }
    seenFitmentKeys.add(key);
    const values = fitments.get(normalized) ?? [];
    values.push({
      engineId: engine.id,
      vehicleModelId: engine.vehicleModelId,
      yearFrom,
      yearTo,
    });
    fitments.set(normalized, values);
  }

  const cyclicReplacementNumbers = cyclicProductImportReplacementNumbers(
    context,
    [...productByNumber.values()].map((product) => ({
      partNumber: product.partNumber,
      replacementPartNumber: product.replacementPartNumber || null,
    })),
  );
  for (const [normalized, product] of productByNumber) {
    const localized = translations.get(normalized) ?? {};
    for (const [locale, label] of [
      ["en", "en"],
      ["zhCn", "zh-cn"],
    ] as const) {
      if (!localized[locale]) {
        addError(errors, {
          code: "TRANSLATION_MISSING",
          field: "语言",
          issue: `产品“${product.partNumber}”缺少 ${label} 翻译。`,
          row: product.row,
          sheet: "翻译",
          suggestion: `为该产品添加语言为 ${label} 的完整翻译行。`,
        });
      }
    }
    const snapshots = specifications.get(normalized) ?? [];
    for (const definition of product.category.specificationAttributes) {
      if (
        definition.required &&
        !snapshots.some(({ attributeId }) => attributeId === definition.id)
      ) {
        addError(errors, {
          code: "SPECIFICATION_ATTRIBUTE_MISSING",
          field: "属性代码",
          issue: `产品“${product.partNumber}”缺少必填规格“${definition.code}”。`,
          row: product.row,
          sheet: "规格值",
          suggestion: `添加属性代码为 ${definition.code} 的规格值行。`,
        });
      }
    }
    const replacementPartNumber = product.replacementPartNumber || null;
    if (replacementPartNumber && product.status !== "discontinued") {
      addError(errors, {
        code: "REPLACEMENT_INVALID",
        field: "替代产品编号",
        issue: "只有已停产产品可以设置替代产品。",
        row: product.row,
        sheet: "产品",
        suggestion: "清空替代产品编号，或将状态改为 discontinued。",
      });
    }
    const replacementNormalized = replacementPartNumber
      ? normalizeProductNumber(replacementPartNumber)
      : null;
    const replacementProduct = replacementNormalized
      ? existingByNumber.get(replacementNormalized)
      : null;
    if (replacementNormalized === normalized) {
      addError(errors, {
        code: "REPLACEMENT_INVALID",
        field: "替代产品编号",
        issue: "产品不能替代自身。",
        row: product.row,
        sheet: "产品",
        suggestion: "填写另一个已有公开版本的产品编号。",
      });
    } else if (replacementPartNumber && !replacementProduct) {
      const importedTarget = productByNumber.has(replacementNormalized!);
      addError(errors, {
        code: importedTarget ? "REPLACEMENT_INVALID" : "REPLACEMENT_NOT_FOUND",
        field: "替代产品编号",
        issue: importedTarget
          ? `替代产品“${replacementPartNumber}”必须已有公开版本。`
          : `替代产品“${replacementPartNumber}”不存在。`,
        row: product.row,
        sheet: "产品",
        suggestion: importedTarget
          ? "先单独导入并发布替代产品，再重新预览本批次。"
          : "填写另一个已存在且已有公开版本的产品编号。",
      });
    } else if (
      replacementProduct &&
      replacementProduct.currentPublicationId === null
    ) {
      addError(errors, {
        code: "REPLACEMENT_INVALID",
        field: "替代产品编号",
        issue: `替代产品“${replacementPartNumber}”必须已有公开版本。`,
        row: product.row,
        sheet: "产品",
        suggestion: "先发布替代产品，再重新预览本批次。",
      });
    } else if (cyclicReplacementNumbers.has(normalized)) {
      addError(errors, {
        code: "REPLACEMENT_INVALID",
        field: "替代产品编号",
        issue: "替代关系不能形成循环。",
        row: product.row,
        sheet: "产品",
        suggestion: "调整替代产品编号，确保替代链不会返回当前产品。",
      });
    }
    if (localized.en && localized.zhCn) {
      payload.products.push({
        baselineCurrentPublicationId:
          product.existing?.currentPublicationId ?? null,
        baselineDraftVersion: product.existing?.draftVersion ?? null,
        baselineLastPublishedVersion:
          product.existing?.draftLastPublishedVersion ?? null,
        baselineNameZhCn: product.existing?.draftNameZhCn ?? null,
        baselineProductId: product.existing?.id ?? null,
        categoryId: product.category.id,
        categoryNameZhCn: product.category.nameZhCn,
        changeKind: product.existing ? "update" : "add",
        changes: [],
        fitments: fitments.get(normalized) ?? [],
        imagePath: product.imagePath,
        partNumber: product.partNumber,
        references: references.get(normalized) ?? [],
        replacementBaselineCurrentPublicationId:
          replacementProduct?.currentPublicationId ?? null,
        replacementBaselineProductId: replacementProduct?.id ?? null,
        replacementPartNumber,
        specifications: snapshots.sort((a, b) => a.position - b.position),
        status: product.status,
        translations: { en: localized.en, zhCn: localized.zhCn },
      });
    }
  }

  const sheetOrder = new Map<string, number>([
    ["工作簿", -1],
    ...PRODUCT_IMPORT_SHEETS.map((sheet, index) => [sheet, index] as const),
  ]);
  errors.sort(
    (left, right) =>
      (sheetOrder.get(left.sheet) ?? 99) -
        (sheetOrder.get(right.sheet) ?? 99) ||
      left.row - right.row ||
      left.field.localeCompare(right.field, "zh-CN"),
  );
  payload.products.sort((left, right) =>
    left.partNumber.localeCompare(right.partNumber),
  );
  payload.replacementGraphFingerprint =
    productImportReplacementGraphFingerprint(context, payload.products);
  const products = [...productByNumber.values()];
  return {
    errors,
    payload,
    summary: {
      addedCount: products.filter(({ existing }) => existing === null).length,
      affectedProductCount: products.length,
      updatedCount: products.filter(({ existing }) => existing !== null).length,
    },
  };
}

export async function createProductImportErrorWorkbook(
  errors: ProductImportError[],
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("错误报告");
  worksheet.addRow(["工作表", "行号", "字段", "错误代码", "问题", "修正建议"]);
  for (const error of errors) {
    worksheet.addRow([
      error.sheet,
      error.row || "—",
      error.field,
      error.code,
      error.issue,
      error.suggestion,
    ]);
  }
  styleWorksheet(worksheet);
  worksheet.getColumn(4).width = 38;
  worksheet.getColumn(5).width = 64;
  worksheet.getColumn(6).width = 64;
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export const PRODUCT_IMPORT_XLSX_MIME = XLSX_MIME;

export function productImportCatalogFingerprint(
  context: ProductImportCatalogContext,
): string {
  const catalog = {
    categories: context.categories
      .map((category) => ({
        code: category.code,
        id: category.id,
        specificationAttributes: category.specificationAttributes
          .map((definition) => ({
            baseUnit: definition.baseUnit,
            code: definition.code,
            dataType: definition.dataType,
            filterable: definition.filterable,
            id: definition.id,
            maximumDecimalValue: definition.maximumDecimalValue,
            minimumDecimalValue: definition.minimumDecimalValue,
            nameEn: definition.nameEn,
            nameZhCn: definition.nameZhCn,
            options: [...definition.options]
              .map((option) => ({
                code: option.code,
                labelEn: option.labelEn,
                labelZhCn: option.labelZhCn,
              }))
              .sort((left, right) => left.code.localeCompare(right.code)),
            position: definition.position,
            required: definition.required,
          }))
          .sort((left, right) => left.position - right.position),
      }))
      .sort((left, right) => left.code.localeCompare(right.code)),
    engines: context.engines
      .map((engine) => ({
        code: engine.code,
        id: engine.id,
        makeName: engine.makeName,
        modelName: engine.modelName,
        vehicleModelId: engine.vehicleModelId,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
  return createHash("sha256").update(JSON.stringify(catalog)).digest("hex");
}

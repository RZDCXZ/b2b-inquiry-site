import ExcelJS from "exceljs";

export function addFuelProductToImportWorkbook(
  workbook: ExcelJS.Workbook,
  {
    fitment = {
      engine: "N13-420",
      make: "Northline",
      model: "HX9",
      yearFrom: 2020,
      yearTo: 2025,
    },
    name,
    partNumber,
    replacementPartNumber = "",
    slug,
    status = "published",
  }: {
    fitment?: {
      engine: string;
      make: string;
      model: string;
      yearFrom: number;
      yearTo: number;
    };
    name: string;
    partNumber: string;
    replacementPartNumber?: string;
    slug: string;
    status?: "discontinued" | "published";
  },
) {
  workbook
    .getWorksheet("产品")!
    .addRow([
      partNumber,
      "fuel",
      "/assets/fuel-filter-product.png",
      status,
      replacementPartNumber,
    ]);
  workbook.getWorksheet("翻译")!.addRows([
    [
      partNumber,
      "en",
      name,
      slug,
      "Imported draft summary.",
      "Imported draft description.",
      `${name} | Torquelis Filters`,
      "Imported draft SEO description.",
      `${name} demonstration image`,
      "Selected Northline commercial vehicles.",
    ],
    [
      partNumber,
      "zh-cn",
      `${name} 中文`,
      `${slug}-zh-cn`,
      "导入的草稿摘要。",
      "导入的草稿详细说明。",
      `${name} 中文｜拓擎利滤清`,
      "导入的草稿 SEO 描述。",
      `${name} 演示图片`,
      "适用于指定 Northline 商用车型。",
    ],
  ]);
  workbook.getWorksheet("规格值")!.addRows([
    [partNumber, "construction_type", "spin_on", ""],
    [partNumber, "outer_diameter", 98, "millimetre"],
    [partNumber, "height", 180, "millimetre"],
    [partNumber, "connection_specification", "M18 × 1.5", ""],
    [partNumber, "filtration_rating", 8, "micrometre"],
    [partNumber, "rated_flow", 5.8, "litre_per_minute"],
    [partNumber, "water_separation", "true", ""],
  ]);
  workbook
    .getWorksheet("参考号")!
    .addRow([partNumber, "Novera", `${partNumber}-REF`]);
  workbook
    .getWorksheet("适配关系")!
    .addRow([
      partNumber,
      fitment.make,
      fitment.model,
      fitment.engine,
      fitment.yearFrom,
      fitment.yearTo,
    ]);
}

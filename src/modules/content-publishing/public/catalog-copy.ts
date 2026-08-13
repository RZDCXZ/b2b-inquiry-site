import type { PublicLocale } from "@/src/modules/site-config/public/locales";

type CatalogCopy = {
  allCategories: string;
  catalogueEyebrow: string;
  catalogueHeading: string;
  catalogueLede: string;
  demoDataNotice: string;
  detailBack: string;
  detailEyebrow: string;
  detailInquiry: string;
  detailPublished: string;
  keySpecificationsHeading: string;
  lookupAction: string;
  lookupBrowseCategories: string;
  lookupClearNumber: string;
  lookupCrossReferenceResult: string;
  lookupCurrentUnit: string;
  lookupEyebrow: string;
  lookupGeneralInquiry: string;
  lookupInputLabel: string;
  lookupKeySpecifications: string;
  lookupMatchCount: (count: number) => string;
  lookupMatchExplanation: string;
  lookupNoResultHeading: string;
  lookupNoResultLede: string;
  lookupReferenceBrand: string;
  lookupReferenceDisclaimer: string;
  lookupReferenceNumber: string;
  lookupSearchByVehicle: string;
  convertedLabel: string;
  metricBaseline: string;
  metadataDescription: string;
  metadataTitle: string;
  partNumberLabel: string;
  productCount: (count: number) => string;
  sortedLabel: string;
  specificationColumn: string;
  specificationsHeading: string;
  unitSystemLabel: string;
  unitSystems: { imperial: string; metric: string };
  valueColumn: string;
  viewProduct: string;
};

const copy: Record<PublicLocale, CatalogCopy> = {
  en: {
    allCategories: "All categories",
    catalogueEyebrow: "STANDARD REPLACEMENT CATALOGUE",
    catalogueHeading: "Standard replacement filters",
    catalogueLede:
      "Browse published Torquelis products across four single-level filtration categories. Every product is identified by a stable part number.",
    demoDataNotice: "Demo data — not for selection or purchasing.",
    detailBack: "Back to products",
    detailEyebrow: "TORQUELIS PART NUMBER",
    detailInquiry: "Inquire about this product",
    detailPublished: "Published",
    keySpecificationsHeading: "Key specifications",
    lookupAction: "Find a filter",
    lookupBrowseCategories: "Browse categories",
    lookupClearNumber: "Clear number",
    lookupCrossReferenceResult: "Cross-reference result",
    lookupCurrentUnit: "Current unit: Metric",
    lookupEyebrow: "PART / REFERENCE LOOKUP",
    lookupGeneralInquiry: "Send a general inquiry",
    lookupInputLabel: "Part or reference number",
    lookupKeySpecifications: "Key specifications",
    lookupMatchCount: (count) =>
      `${count} cross-reference ${count === 1 ? "match" : "matches"}`,
    lookupMatchExplanation:
      "Matched by an exact normalized reference number. Review every result before choosing a standard replacement filter.",
    lookupNoResultHeading: "No exact match found",
    lookupNoResultLede:
      "The number was checked without case, spaces or hyphens. Similar numbers are never substituted automatically.",
    lookupReferenceBrand: "Fictional brand",
    lookupReferenceDisclaimer:
      "Cross-references are numbers from fictional brands, not Torquelis part numbers.",
    lookupReferenceNumber: "Reference number",
    lookupSearchByVehicle: "Search by vehicle",
    convertedLabel: "Converted",
    metricBaseline:
      "Metric values are the persisted baseline. Imperial values are derived for display.",
    metadataDescription:
      "Browse published Torquelis standard replacement filters by category.",
    metadataTitle: "Standard replacement filter catalogue",
    partNumberLabel: "Part number",
    productCount: (count) =>
      `${count} published ${count === 1 ? "product" : "products"}`,
    sortedLabel: "Sorted by Torquelis part number",
    specificationColumn: "Specification",
    specificationsHeading: "Full specifications",
    unitSystemLabel: "Specification units",
    unitSystems: { imperial: "Imperial", metric: "Metric" },
    valueColumn: "Value",
    viewProduct: "View product",
  },
  "zh-cn": {
    allCategories: "全部分类",
    catalogueEyebrow: "标准替换件目录",
    catalogueHeading: "标准替换滤清产品",
    catalogueLede:
      "浏览四个单层滤清分类中的已发布 Torquelis 产品；每项产品都由稳定的产品编号识别。",
    demoDataNotice: "演示数据——不可用于真实选型或采购。",
    detailBack: "返回产品中心",
    detailEyebrow: "TORQUELIS 产品编号",
    detailInquiry: "咨询此产品",
    detailPublished: "已发布",
    keySpecificationsHeading: "关键规格",
    lookupAction: "查找滤清器",
    lookupBrowseCategories: "浏览产品分类",
    lookupClearNumber: "清除号码",
    lookupCrossReferenceResult: "参考号查找结果",
    lookupCurrentUnit: "当前单位：公制",
    lookupEyebrow: "产品编号／参考号查找",
    lookupGeneralInquiry: "提交通用询盘",
    lookupInputLabel: "产品编号或参考号",
    lookupKeySpecifications: "关键规格",
    lookupMatchCount: (count) => `${count} 项参考号匹配`,
    lookupMatchExplanation:
      "以下结果来自标准化后的精确参考号匹配。请选择标准替换件前逐项核对。",
    lookupNoResultHeading: "未找到精确匹配",
    lookupNoResultLede:
      "系统已忽略大小写、空格和连字符；不会自动替换成相似号码。",
    lookupReferenceBrand: "虚构品牌",
    lookupReferenceDisclaimer: "参考号来自虚构品牌，不是 Torquelis 产品编号。",
    lookupReferenceNumber: "参考号",
    lookupSearchByVehicle: "改用车型查找",
    convertedLabel: "换算值",
    metricBaseline: "公制值是持久化基准；英制值仅由系统换算用于显示。",
    metadataDescription: "按分类浏览已发布的 Torquelis 标准替换滤清产品。",
    metadataTitle: "标准替换滤清产品目录",
    partNumberLabel: "产品编号",
    productCount: (count) => `${count} 项已发布产品`,
    sortedLabel: "按 Torquelis 产品编号排序",
    specificationColumn: "规格属性",
    specificationsHeading: "完整规格",
    unitSystemLabel: "规格单位",
    unitSystems: { imperial: "英制", metric: "公制" },
    valueColumn: "数值",
    viewProduct: "查看产品",
  },
};

export function getCatalogCopy(locale: PublicLocale): CatalogCopy {
  return copy[locale];
}

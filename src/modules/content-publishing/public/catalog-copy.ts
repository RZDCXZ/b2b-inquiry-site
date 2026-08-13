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
  detailSummaryHeading: string;
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
    detailSummaryHeading: "Product summary",
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
    detailSummaryHeading: "产品摘要",
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

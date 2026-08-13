import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import type { SpecificationFilterIssueCode } from "@/src/modules/catalog/public/specification-filters";

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
  filterAny: string;
  filterApply: string;
  filterCategoryLabel: string;
  filterChooseCategory: string;
  filterClose: string;
  filterIssues: Record<SpecificationFilterIssueCode, string>;
  filterIssuesHeading: string;
  filterMaximumLabel: (attribute: string) => string;
  filterMinimumLabel: (attribute: string) => string;
  filterOpen: string;
  filterUnitHelper: string;
  filterYes: string;
  filterNo: string;
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
  resultCatalogueType: string;
  resultClearFilters: string;
  resultCurrentUnit: string;
  resultCurrentUnitFor: (unit: string) => string;
  resultGeneralInquiry: string;
  resultNoMatchesHeading: string;
  resultNoMatchesLede: string;
  resultSearchByNumber: string;
  resultVehicleType: string;
  resultSpecificationType: string;
  sortedLabel: string;
  paginationLabel: string;
  paginationNext: string;
  paginationPrevious: string;
  paginationStatus: (page: number, pageCount: number) => string;
  specificationColumn: string;
  specificationsHeading: string;
  unitSystemLabel: string;
  unitSystems: { imperial: string; metric: string };
  valueColumn: string;
  viewProduct: string;
  vehicleBrandLabel: string;
  vehicleCategoryLabel: string;
  vehicleChooseBrand: string;
  vehicleChooseCategory: string;
  vehicleChooseEngine: string;
  vehicleChooseModel: string;
  vehicleChooseYear: string;
  vehicleEngineLabel: string;
  vehicleHelper: string;
  vehicleModelLabel: string;
  vehicleSearchAction: string;
  vehicleYearLabel: string;
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
    filterAny: "Any",
    filterApply: "Apply specifications",
    filterCategoryLabel: "Filter category",
    filterChooseCategory: "Choose a filter category",
    filterClose: "Close filters",
    filterIssues: {
      duplicate_parameter: "A filter parameter was repeated and was ignored.",
      invalid_category: "The category in this URL is no longer available.",
      invalid_filter_parameter:
        "A specification parameter has an invalid format.",
      invalid_filter_value: "A specification value is invalid or out of range.",
      invalid_page: "The page number is invalid; page 1 is shown.",
      invalid_range:
        "A specification minimum cannot be greater than its maximum.",
      invalid_unit: "The unit preference is invalid; Metric is shown.",
      missing_category:
        "Choose a category before applying specification filters.",
      not_filterable:
        "This specification is not available as a catalogue filter.",
      page_out_of_range:
        "That result page is no longer available; the last page is shown.",
      unknown_attribute: "This specification filter is no longer available.",
      wrong_category_attribute:
        "A specification does not belong to the selected category.",
    },
    filterIssuesHeading: "Some shared filters need attention",
    filterMaximumLabel: (attribute) => `${attribute} maximum`,
    filterMinimumLabel: (attribute) => `${attribute} minimum`,
    filterOpen: "Open specification filters",
    filterUnitHelper:
      "Numeric conditions are stored and compared against metric baseline values.",
    filterYes: "Yes",
    filterNo: "No",
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
    resultCatalogueType: "Catalogue results",
    resultClearFilters: "Clear filters",
    resultCurrentUnit: "Current unit: Metric",
    resultCurrentUnitFor: (unit) => `Current unit: ${unit}`,
    resultGeneralInquiry: "Send a general inquiry",
    resultNoMatchesHeading: "No matching filters",
    resultNoMatchesLede:
      "No published standard replacement filter matches every selected vehicle or specification condition.",
    resultSearchByNumber: "Search by number",
    resultVehicleType: "Vehicle fitment results",
    resultSpecificationType: "Category specification results",
    sortedLabel: "Sorted by Torquelis part number",
    paginationLabel: "Catalogue result pages",
    paginationNext: "Next page",
    paginationPrevious: "Previous page",
    paginationStatus: (page, pageCount) => `Page ${page} of ${pageCount}`,
    specificationColumn: "Specification",
    specificationsHeading: "Full specifications",
    unitSystemLabel: "Specification units",
    unitSystems: { imperial: "Imperial", metric: "Metric" },
    valueColumn: "Value",
    viewProduct: "View product",
    vehicleBrandLabel: "Brand",
    vehicleCategoryLabel: "Filter category",
    vehicleChooseBrand: "Choose a brand",
    vehicleChooseCategory: "Choose a filter category",
    vehicleChooseEngine: "Choose an engine",
    vehicleChooseModel: "Choose a model",
    vehicleChooseYear: "Choose a year",
    vehicleEngineLabel: "Engine",
    vehicleHelper:
      "Each step only shows applications supported by the selections before it.",
    vehicleModelLabel: "Model",
    vehicleSearchAction: "Show matching filters",
    vehicleYearLabel: "Year",
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
    filterAny: "不限",
    filterApply: "应用规格条件",
    filterCategoryLabel: "滤清器分类",
    filterChooseCategory: "选择滤清器分类",
    filterClose: "关闭筛选",
    filterIssues: {
      duplicate_parameter: "URL 中有重复筛选参数，系统已忽略该条件。",
      invalid_category: "URL 中的分类已失效或不存在。",
      invalid_filter_parameter: "某个规格参数格式不正确。",
      invalid_filter_value: "某个规格值无效或超出允许范围。",
      invalid_page: "页码无效，已显示第 1 页。",
      invalid_range: "规格最小值不能大于最大值。",
      invalid_unit: "单位偏好无效，已显示公制。",
      missing_category: "请先选择分类，再应用规格筛选。",
      not_filterable: "该规格不能用于目录筛选。",
      page_out_of_range: "该结果页已不存在，已显示最后一页。",
      unknown_attribute: "该规格筛选已失效或不存在。",
      wrong_category_attribute: "某个规格不属于当前分类。",
    },
    filterIssuesHeading: "部分分享条件需要处理",
    filterMaximumLabel: (attribute) => `${attribute}最大值`,
    filterMinimumLabel: (attribute) => `${attribute}最小值`,
    filterOpen: "打开规格筛选",
    filterUnitHelper: "数值条件始终按公制基准值保存和比较。",
    filterYes: "是",
    filterNo: "否",
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
    resultCatalogueType: "目录结果",
    resultClearFilters: "清除筛选",
    resultCurrentUnit: "当前单位：公制",
    resultCurrentUnitFor: (unit) => `当前单位：${unit}`,
    resultGeneralInquiry: "提交通用询盘",
    resultNoMatchesHeading: "没有匹配的滤清器",
    resultNoMatchesLede: "没有已发布标准替换件同时符合全部已选车型或规格条件。",
    resultSearchByNumber: "改用编号查找",
    resultVehicleType: "车型适配结果",
    resultSpecificationType: "分类规格结果",
    sortedLabel: "按 Torquelis 产品编号排序",
    paginationLabel: "产品结果分页",
    paginationNext: "下一页",
    paginationPrevious: "上一页",
    paginationStatus: (page, pageCount) => `第 ${page} / ${pageCount} 页`,
    specificationColumn: "规格属性",
    specificationsHeading: "完整规格",
    unitSystemLabel: "规格单位",
    unitSystems: { imperial: "英制", metric: "公制" },
    valueColumn: "数值",
    viewProduct: "查看产品",
    vehicleBrandLabel: "商用车品牌",
    vehicleCategoryLabel: "滤清器分类",
    vehicleChooseBrand: "选择品牌",
    vehicleChooseCategory: "选择滤清器分类",
    vehicleChooseEngine: "选择发动机",
    vehicleChooseModel: "选择车型",
    vehicleChooseYear: "选择年份",
    vehicleEngineLabel: "发动机",
    vehicleHelper: "每一步只显示与前序条件存在有效适配关系的选项。",
    vehicleModelLabel: "车型",
    vehicleSearchAction: "显示匹配产品",
    vehicleYearLabel: "适用年份",
  },
};

export function getCatalogCopy(locale: PublicLocale): CatalogCopy {
  return copy[locale];
}

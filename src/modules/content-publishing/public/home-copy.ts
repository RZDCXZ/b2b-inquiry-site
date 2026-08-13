import type { PublicLocale } from "@/src/modules/site-config/public/locales";

type HomeCopy = {
  brandDescriptor: string;
  categories: ReadonlyArray<{ name: string; detail: string }>;
  categoryEyebrow: string;
  categoryHeading: string;
  companyName: string;
  demoNotice: string;
  eyebrow: string;
  familyImageAlt: string;
  findAction: string;
  finderLabel: string;
  finderModes: ReadonlyArray<{
    inputLabel: string;
    label: string;
    placeholder: string;
  }>;
  footerDescription: string;
  footerExplore: string;
  footerInformation: string;
  footerPrivacy: string;
  footerContact: string;
  heading: string;
  helper: string;
  heroImageAlt: string;
  languageLabel: string;
  lede: string;
  metadataDescription: string;
  metadataTitle: string;
  mobileNavigationLabel: string;
  nav: ReadonlyArray<{ label: string; anchor: string }>;
  primaryNavigationLabel: string;
  process: ReadonlyArray<{ title: string; detail: string }>;
  processEyebrow: string;
  processHeading: string;
};

const copy: Record<PublicLocale, HomeCopy> = {
  en: {
    brandDescriptor: "Commercial vehicle filtration",
    categories: [
      { name: "Fuel filters", detail: "Protect fuel systems" },
      { name: "Oil filters", detail: "Keep engines clean" },
      { name: "Air filters", detail: "Optimise airflow" },
      { name: "Cabin filters", detail: "Improve cabin air" },
    ],
    categoryEyebrow: "STRUCTURED PRODUCT CATALOGUE",
    categoryHeading: "Four categories. One reliable information model.",
    companyName: "Torquelis Filters / 拓擎利滤清",
    demoNotice:
      "Fictional demo manufacturer. All product and performance data are for demonstration only.",
    eyebrow: "COMMERCIAL VEHICLE FILTRATION",
    familyImageAlt: "Four commercial vehicle filter categories",
    findAction: "Find a filter",
    finderLabel: "Product finder modes",
    finderModes: [
      {
        inputLabel: "Part or reference number",
        label: "PART / REFERENCE",
        placeholder: "e.g. TQ-FL-4827",
      },
      {
        inputLabel: "Vehicle make, model or engine",
        label: "VEHICLE",
        placeholder: "e.g. Volvo FH D13",
      },
      {
        inputLabel: "Category or specification",
        label: "CATEGORY & SPECS",
        placeholder: "e.g. fuel filter 93 mm",
      },
    ],
    footerDescription:
      "Structured product discovery and inquiries for commercial vehicle filtration.",
    footerExplore: "Explore",
    footerInformation: "Information",
    footerPrivacy: "Privacy & demo data",
    footerContact: "Contact sample",
    heading: "Find the right filter, without the guesswork.",
    helper:
      "Search ignores case, spaces and hyphens. Cross-reference matches remain clearly identified.",
    heroImageAlt:
      "Fuel filter cutaway with dimensional and fluid path annotations",
    languageLabel: "Language",
    lede: "Search Torquelis part numbers, cross-references or vehicle applications, then send a structured inquiry with the product context attached.",
    metadataDescription:
      "Find commercial vehicle filtration products and send a structured inquiry.",
    metadataTitle: "Commercial vehicle filter finder",
    mobileNavigationLabel: "Toggle navigation",
    nav: [
      { label: "Products", anchor: "products" },
      { label: "Private Label", anchor: "private-label" },
      { label: "Manufacturing & Quality", anchor: "quality" },
      { label: "Technical Resources", anchor: "resources" },
      { label: "About", anchor: "about" },
      { label: "Contact", anchor: "contact" },
    ],
    primaryNavigationLabel: "Primary navigation",
    process: [
      {
        title: "Find",
        detail:
          "Use a part number, vehicle application or exact specifications.",
      },
      {
        title: "Verify",
        detail: "Compare fitment, dimensions and clearly separated references.",
      },
      {
        title: "Inquire",
        detail:
          "Send a structured request without re-entering product context.",
      },
    ],
    processEyebrow: "FROM FITMENT TO FOLLOW-UP",
    processHeading: "A product context that stays attached.",
  },
  "zh-cn": {
    brandDescriptor: "商用车滤清产品",
    categories: [
      { name: "燃油滤清器", detail: "保护燃油系统" },
      { name: "机油滤清器", detail: "保持发动机清洁" },
      { name: "空气滤清器", detail: "优化进气效率" },
      { name: "空调滤清器", detail: "改善驾驶室空气" },
    ],
    categoryEyebrow: "结构化产品目录",
    categoryHeading: "四类滤清产品，共用一套可靠信息模型。",
    companyName: "Torquelis Filters / 拓擎利滤清",
    demoNotice: "虚构演示制造商。所有产品与性能数据仅用于功能演示。",
    eyebrow: "商用车滤清产品",
    familyImageAlt: "四类商用车滤清产品",
    findAction: "查找滤清器",
    finderLabel: "产品查找方式",
    finderModes: [
      {
        inputLabel: "产品编号或参考号",
        label: "产品／参考号",
        placeholder: "例如 TQ-FL-4827",
      },
      {
        inputLabel: "商用车型、型号或发动机",
        label: "商用车型",
        placeholder: "例如 沃尔沃 FH D13",
      },
      {
        inputLabel: "分类或规格",
        label: "分类与规格",
        placeholder: "例如 燃油滤清器 93 毫米",
      },
    ],
    footerDescription: "面向商用车滤清产品的结构化查找与询盘系统。",
    footerExplore: "产品与能力",
    footerInformation: "信息",
    footerPrivacy: "隐私与演示数据",
    footerContact: "联系信息样例",
    heading: "准确找到滤清器，不靠猜测。",
    helper: "查找忽略大小写、空格和连字符；参考号匹配会始终清楚标注。",
    heroImageAlt: "带尺寸与流体路径标注的燃油滤清器剖面",
    languageLabel: "语言",
    lede: "通过 Torquelis 产品编号、参考号或商用车型查找产品，再携带完整产品上下文提交结构化询盘。",
    metadataDescription: "查找商用车滤清产品并提交结构化询盘。",
    metadataTitle: "商用车滤清产品查找",
    mobileNavigationLabel: "打开或关闭导航",
    nav: [
      { label: "产品中心", anchor: "products" },
      { label: "贴牌服务", anchor: "private-label" },
      { label: "制造与品控", anchor: "quality" },
      { label: "技术资源", anchor: "resources" },
      { label: "关于我们", anchor: "about" },
      { label: "联系", anchor: "contact" },
    ],
    primaryNavigationLabel: "主要导航",
    process: [
      { title: "查找", detail: "使用产品编号、车型应用或精确规格进入目录。" },
      { title: "核对", detail: "比较适配关系、尺寸和清楚分列的参考号。" },
      { title: "询盘", detail: "无需重复填写产品信息，即可提交结构化需求。" },
    ],
    processEyebrow: "从适配到跟进",
    processHeading: "让产品上下文贯穿整个询盘过程。",
  },
};

export function getHomeCopy(locale: PublicLocale): HomeCopy {
  return copy[locale];
}

export function getHomeMetadataCopy(locale: PublicLocale) {
  const localeCopy = copy[locale];

  return {
    description: localeCopy.metadataDescription,
    title: localeCopy.metadataTitle,
  };
}

import type { PublicLocale } from "@/src/modules/site-config/public/locales";

type InquiryCopy = {
  company: string;
  consent: string;
  contactName: string;
  countryRegion: string;
  customPackaging: string;
  errorExpired: string;
  errorChoice: string;
  errorConsent: string;
  errorCount: (count: number) => string;
  errorEmail: string;
  errorHeading: string;
  errorInvalid: string;
  errorMessageField: string;
  errorOptionalField: string;
  errorRequiredField: string;
  errorUnavailable: string;
  expectedQuantity: string;
  formHelper: string;
  generalEyebrow: string;
  generalHeading: string;
  generalLede: string;
  inquiryBoundary: string;
  message: string;
  metadataDescription: string;
  metadataTitle: string;
  optional: string;
  phone: string;
  privateLabel: string;
  productContext: string;
  productEyebrow: string;
  productHeading: string;
  productLede: string;
  required: string;
  returnToProduct: string;
  send: string;
  successEyebrow: string;
  successHeading: string;
  successLede: string;
  successMetadataTitle: string;
  successProduct: string;
  successReference: string;
  successReturnProduct: string;
  successSearchProducts: string;
  targetMarket: string;
  workEmail: string;
};

const copy: Record<PublicLocale, InquiryCopy> = {
  en: {
    company: "Company",
    consent: "I agree to the privacy and demo data notice.",
    contactName: "Name",
    countryRegion: "Country or region",
    customPackaging: "Custom packaging needed",
    errorChoice: "Choose a valid option.",
    errorConsent: "Consent is required before submitting.",
    errorCount: (count) =>
      `${count} field${count === 1 ? "" : "s"} need attention`,
    errorEmail: "Enter a valid work email address.",
    errorExpired:
      "This submission session has expired. Review the form and send it again.",
    errorHeading: "The inquiry was not submitted",
    errorInvalid:
      "Check every required field and use a valid email address, then send the inquiry again.",
    errorMessageField: "Enter a message between 10 and 5,000 characters.",
    errorOptionalField: "Shorten this value to the allowed length.",
    errorRequiredField: "Enter a value for this required field.",
    errorUnavailable:
      "The inquiry service is temporarily unavailable. Please try again.",
    expectedQuantity: "Expected purchase quantity",
    formHelper:
      "We store the source page, optional product and interface language with this inquiry.",
    generalEyebrow: "GENERAL INQUIRY",
    generalHeading: "Tell us what your sourcing program needs.",
    generalLede:
      "Use this form for private label requirements or when you have not found a matching standard replacement filter.",
    inquiryBoundary: "This is an inquiry, not an order or official quotation.",
    message: "Message",
    metadataDescription:
      "Send a structured product or general inquiry to the Torquelis local demo workflow.",
    metadataTitle: "Send an inquiry",
    optional: "Optional",
    phone: "Phone or WhatsApp",
    privateLabel: "Private label needed",
    productContext: "PRODUCT CONTEXT · READ ONLY",
    productEyebrow: "PRODUCT INQUIRY",
    productHeading: "Send the product context with your request.",
    productLede:
      "The selected standard replacement filter stays attached to your structured inquiry.",
    required: "Required",
    returnToProduct: "Return to product",
    send: "Send inquiry",
    successEyebrow: "INQUIRY RECEIVED",
    successHeading: "Your request is now in the demo workflow.",
    successLede:
      "Our demo workflow will route this inquiry to an assigned sales representative. No contact details or message content are shown on this page.",
    successMetadataTitle: "Inquiry received",
    successProduct: "Related product",
    successReference: "Inquiry reference",
    successReturnProduct: "Return to product",
    successSearchProducts: "Find another filter",
    targetMarket: "Target sales market",
    workEmail: "Work email",
  },
  "zh-cn": {
    company: "公司",
    consent: "我同意隐私与演示数据说明。",
    contactName: "姓名",
    countryRegion: "国家或地区",
    customPackaging: "需要定制包装",
    errorChoice: "请选择有效选项。",
    errorConsent: "提交前必须同意隐私与演示数据说明。",
    errorCount: (count) => `${count} 个字段需要处理`,
    errorEmail: "请输入有效的工作邮箱。",
    errorExpired: "本次提交会话已过期。请检查表单后重新提交。",
    errorHeading: "询盘尚未提交",
    errorInvalid: "请检查所有必填项并使用有效邮箱地址，然后重新提交询盘。",
    errorMessageField: "请输入 10 至 5,000 个字符的留言。",
    errorOptionalField: "请将此内容缩短到允许的长度。",
    errorRequiredField: "请填写此必填项。",
    errorUnavailable: "询盘服务暂时不可用，请稍后重试。",
    expectedQuantity: "预计采购数量",
    formHelper: "系统会随询盘保存来源页面、可选产品与界面语言。",
    generalEyebrow: "通用询盘",
    generalHeading: "请说明您的采购项目需求。",
    generalLede: "适用于贴牌需求，或尚未找到匹配标准替换件时的咨询。",
    inquiryBoundary: "这是询盘，不是订单或正式报价。",
    message: "留言",
    metadataDescription:
      "向 Torquelis 本地演示工作流提交结构化产品或通用询盘。",
    metadataTitle: "提交询盘",
    optional: "选填",
    phone: "电话或 WhatsApp",
    privateLabel: "需要贴牌",
    productContext: "产品上下文 · 只读",
    productEyebrow: "产品询盘",
    productHeading: "让产品上下文随需求一起提交。",
    productLede: "已选择的标准替换件会持续关联到本次结构化询盘。",
    required: "必填",
    returnToProduct: "返回产品",
    send: "提交询盘",
    successEyebrow: "询盘已收到",
    successHeading: "您的需求已进入演示工作流。",
    successLede:
      "演示工作流会把此询盘交给业务人员处理。本页不会显示联系方式或留言内容。",
    successMetadataTitle: "询盘已收到",
    successProduct: "关联产品",
    successReference: "询盘参考号",
    successReturnProduct: "返回产品",
    successSearchProducts: "继续查找滤清器",
    targetMarket: "目标销售市场",
    workEmail: "工作邮箱",
  },
};

export function getInquiryCopy(locale: PublicLocale): InquiryCopy {
  return copy[locale];
}

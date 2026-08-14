import type { PublicLocale } from "@/src/modules/site-config/public/locales";

export type InquiryDatabaseLocale = "en" | "zh_cn";

export function inquiryLocaleToDatabase(
  locale: PublicLocale,
): InquiryDatabaseLocale {
  return locale === "en" ? "en" : "zh_cn";
}

export function inquiryLocaleFromDatabase(
  locale: InquiryDatabaseLocale,
): PublicLocale {
  return locale === "en" ? "en" : "zh-cn";
}

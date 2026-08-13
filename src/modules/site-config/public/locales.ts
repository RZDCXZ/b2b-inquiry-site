import { z } from "zod";

export const PUBLIC_LOCALES = ["en", "zh-cn"] as const;

export const PUBLIC_LOCALE_SCHEMA = z.enum(PUBLIC_LOCALES);

export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export function isPublicLocale(value: string): value is PublicLocale {
  return PUBLIC_LOCALES.includes(value as PublicLocale);
}

export function localeHtmlLanguage(locale: PublicLocale): string {
  return locale === "en" ? "en" : "zh-CN";
}

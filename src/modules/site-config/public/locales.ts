export const PUBLIC_LOCALES = ["en", "zh-cn"] as const;

export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export function isPublicLocale(value: string): value is PublicLocale {
  return PUBLIC_LOCALES.includes(value as PublicLocale);
}

export function localeHtmlLanguage(locale: PublicLocale): string {
  return locale === "en" ? "en" : "zh-CN";
}

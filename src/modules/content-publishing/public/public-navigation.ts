import type { PublicLocale } from "@/src/modules/site-config/public/locales";

export const PUBLIC_ROUTE_BY_NAVIGATION_ANCHOR: Readonly<
  Record<string, string>
> = {
  about: "about",
  contact: "inquiry",
  "private-label": "private-label",
  products: "products",
  quality: "quality",
  resources: "resources",
};

export function publicNavigationHref(
  locale: PublicLocale,
  anchor: string,
): string {
  const route = PUBLIC_ROUTE_BY_NAVIGATION_ANCHOR[anchor] ?? "";
  return `/${locale}/${route}`.replace(/\/$/u, "");
}

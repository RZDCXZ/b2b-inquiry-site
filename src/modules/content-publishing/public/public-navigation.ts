import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import { CORE_PAGE_DEFINITIONS } from "@/src/modules/content-publishing/public/core-page-contracts";

export const PUBLIC_ROUTE_BY_NAVIGATION_ANCHOR: Readonly<
  Record<string, string>
> = Object.fromEntries([
  ["products", "products"],
  ...Object.values(CORE_PAGE_DEFINITIONS).flatMap((definition) =>
    definition.navigationAnchor
      ? [[definition.navigationAnchor, definition.route.replace(/^\//u, "")]]
      : [],
  ),
]);

export function publicNavigationHref(
  locale: PublicLocale,
  anchor: string,
): string {
  const route = PUBLIC_ROUTE_BY_NAVIGATION_ANCHOR[anchor] ?? "";
  return `/${locale}/${route}`.replace(/\/$/u, "");
}

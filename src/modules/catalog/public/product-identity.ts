import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import { PUBLIC_LOCALE_SCHEMA } from "@/src/modules/site-config/public/locales";
import { z } from "zod";

export const PRODUCT_CATEGORY_CODES = ["air", "oil", "fuel", "cabin"] as const;

export type ProductCategoryCode = (typeof PRODUCT_CATEGORY_CODES)[number];

export const PRODUCT_CATEGORY_CODE_SCHEMA = z.enum(PRODUCT_CATEGORY_CODES);

export const CATALOG_ROUTE_PARAMS_SCHEMA = z.object({
  locale: PUBLIC_LOCALE_SCHEMA,
});

export const CATALOG_SEARCH_PARAMS_SCHEMA = z.object({
  category: PRODUCT_CATEGORY_CODE_SCHEMA.optional(),
  part: z.string().trim().min(1).max(64).optional(),
});

const LOCALIZED_PRODUCT_SLUG_SCHEMA = z
  .string()
  .min(1)
  .max(180)
  .refine(
    (value) => {
      try {
        decodeURIComponent(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid encoded product slug." },
  )
  .transform((value) => decodeURIComponent(value));

export const PRODUCT_ROUTE_PARAMS_SCHEMA = z.object({
  locale: PUBLIC_LOCALE_SCHEMA,
  partNumber: z.string().trim().min(1).max(64),
  slug: LOCALIZED_PRODUCT_SLUG_SCHEMA,
});

export function normalizeProductNumber(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function productDetailPath(
  locale: PublicLocale,
  product: { partNumber: string; slug: string },
): string {
  return `/${locale}/products/${encodeURIComponent(product.partNumber)}/${encodeURIComponent(product.slug)}`;
}

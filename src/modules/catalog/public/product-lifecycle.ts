export const PRODUCT_STATUSES = ["draft", "published", "discontinued"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type PublicProductStatus = Exclude<ProductStatus, "draft">;

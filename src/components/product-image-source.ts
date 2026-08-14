import type { StaticImageData } from "next/image";

import filterFamily from "@/product-ui/public/assets/filter-family.png";
import fuelFilter from "@/product-ui/public/assets/fuel-filter-product.png";

const generatedProductImages: Record<string, StaticImageData> = {
  "/assets/filter-family.png": filterFamily,
  "/assets/fuel-filter-product.png": fuelFilter,
};

export function productImageSource(
  imagePath: string,
): StaticImageData | string {
  return (
    generatedProductImages[imagePath] ??
    (imagePath.startsWith("/media/assets/") ? imagePath : filterFamily)
  );
}

import { describe, expect, it } from "vitest";

import {
  CATALOG_SEARCH_PARAMS_SCHEMA,
  normalizeProductNumber,
  productDetailPath,
  PRODUCT_ROUTE_PARAMS_SCHEMA,
} from "@/src/modules/catalog/public/product-identity";

describe("标准替换件身份", () => {
  it("标准化产品编号时忽略大小写、空格和连字符", () => {
    expect(normalizeProductNumber(" tq - fl 4827 ")).toBe("TQFL4827");
  });

  it("产品地址同时包含语言、产品编号和本地化名称", () => {
    expect(
      productDetailPath("zh-cn", {
        partNumber: "TQ-FL-4827",
        slug: "高效燃油滤清器",
      }),
    ).toBe(
      "/zh-cn/products/TQ-FL-4827/%E9%AB%98%E6%95%88%E7%87%83%E6%B2%B9%E6%BB%A4%E6%B8%85%E5%99%A8",
    );
  });

  it("用 Zod 在路由边界拒绝未知分类和无效编码名称", () => {
    expect(
      CATALOG_SEARCH_PARAMS_SCHEMA.safeParse({ category: "unknown" }).success,
    ).toBe(false);
    expect(
      PRODUCT_ROUTE_PARAMS_SCHEMA.safeParse({
        locale: "en",
        partNumber: "TQ-FL-4827",
        slug: "%E0%A4%A",
      }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { isArticleSlugUniqueConstraintError } from "@/src/application/site-content-management";
import {
  isPublicNavigationVisible,
  publicNavigationHref,
} from "@/src/modules/content-publishing/public/public-navigation";

describe("公开路由边界", () => {
  it("识别 Prisma PG adapter 返回的嵌套文章 slug 唯一冲突", () => {
    expect(
      isArticleSlugUniqueConstraintError({
        code: "P2002",
        meta: {
          driverAdapterError: {
            cause: {
              constraint: {
                fields: ["locale", "current_published_slug"],
              },
            },
          },
        },
      }),
    ).toBe(true);
    expect(isArticleSlugUniqueConstraintError({ code: "P2025" })).toBe(false);
  });

  it("从核心页定义派生地址并统一判断归档页面入口", () => {
    expect(publicNavigationHref("en", "contact")).toBe("/en/inquiry");
    expect(publicNavigationHref("zh-cn", "resources")).toBe("/zh-cn/resources");
    expect(
      isPublicNavigationVisible(["products", "resources"], "contact"),
    ).toBe(false);
    expect(
      isPublicNavigationVisible(["products", "resources"], "resources"),
    ).toBe(true);
  });
});

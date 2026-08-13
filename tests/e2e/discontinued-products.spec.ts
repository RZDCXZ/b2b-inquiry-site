import { expect, test } from "@playwright/test";

test("已停产产品保留历史页面并链接同语言替代产品", async ({ page }) => {
  await page.goto("/en/products/TQ-FL-4720/legacy-fuel-filter");

  await expect(
    page.getByRole("heading", { exact: true, name: "TQ-FL-4720" }),
  ).toBeVisible();
  await expect(page.getByText("Discontinued", { exact: true })).toBeVisible();
  await expect(
    page.getByText("This product is discontinued.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /TQ-FL-4827/ })).toHaveAttribute(
    "href",
    "/en/products/TQ-FL-4827/high-efficiency-fuel-filter",
  );
  await expect(
    page.getByRole("rowheader", { exact: true, name: "Outer diameter" }),
  ).toBeVisible();
});

test("没有替代产品的已停产页面明确保留历史信息", async ({ page }) => {
  await page.goto(
    "/zh-cn/products/TQ-AF-2000/%E5%8E%86%E5%8F%B2%E7%A9%BA%E6%B0%94%E6%BB%A4%E6%B8%85%E5%99%A8",
  );

  await expect(
    page.getByRole("heading", { exact: true, name: "TQ-AF-2000" }),
  ).toBeVisible();
  await expect(page.getByText("已停产", { exact: true })).toBeVisible();
  await expect(
    page.getByText("当前没有指定替代产品。", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("rowheader", { exact: true, name: "外径" }),
  ).toBeVisible();
});

test("旧本地化名称永久重定向到同语言当前地址并保留单位", async ({
  request,
}) => {
  const response = await request.get(
    "/en/products/TQ-FL-4827/previous-fuel-filter-name?unit=imperial",
    { maxRedirects: 0 },
  );

  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe(
    "/en/products/TQ-FL-4827/high-efficiency-fuel-filter?unit=imperial",
  );
});

test("不存在的产品编号返回资源不存在而不按名称片段匹配", async ({ page }) => {
  const response = await page.goto(
    "/en/products/TQ-NO-9999/high-efficiency-fuel-filter",
  );

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { exact: true, name: "TQ-FL-4827" }),
  ).toHaveCount(0);
});

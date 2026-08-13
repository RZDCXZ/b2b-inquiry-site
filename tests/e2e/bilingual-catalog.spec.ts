import { expect, test } from "@playwright/test";

test("采购者可浏览四类已发布标准替换件并在双语详情间保留同一产品", async ({
  page,
}) => {
  const categories = [
    ["air", "Air filters", "TQ-AF-2106"],
    ["oil", "Oil filters", "TQ-OF-1038"],
    ["fuel", "Fuel filters", "TQ-FL-4827"],
    ["cabin", "Cabin filters", "TQ-CF-3021"],
  ] as const;

  await page.goto("/zh-cn/products?category=air");
  await expect(
    page.getByRole("heading", { exact: true, name: "空气滤清器" }),
  ).toBeVisible();
  await expect(page.getByText("高容空气滤清器", { exact: true })).toBeVisible();

  for (const [code, name, partNumber] of categories) {
    await page.goto(`/en/products?category=${code}`);
    await expect(
      page.getByRole("heading", { exact: true, name }),
    ).toBeVisible();
    await expect(page.getByText(partNumber, { exact: true })).toBeVisible();
    await expect(page.getByText("TQ-DF-9000", { exact: true })).toHaveCount(0);
  }

  await page.goto("/en/products?category=fuel");
  await page.getByRole("link", { name: /TQ-FL-4827/ }).click();
  await expect(page).toHaveURL(
    /\/en\/products\/TQ-FL-4827\/high-efficiency-fuel-filter$/,
  );
  await expect(
    page.getByRole("heading", { name: "High-Efficiency Fuel Filter" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Fictional demo manufacturer. All product and performance data are for demonstration only.",
      { exact: true },
    ),
  ).toBeVisible();

  await page.getByRole("link", { name: "简中" }).click();
  await expect(page).toHaveURL(
    /\/zh-cn\/products\/TQ-FL-4827\/%E9%AB%98%E6%95%88%E7%87%83%E6%B2%B9%E6%BB%A4%E6%B8%85%E5%99%A8$/,
  );
  await expect(
    page.getByRole("heading", { name: "高效燃油滤清器" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "TQ-FL-4827" }),
  ).toBeVisible();
  await expect(
    page.getByText("虚构演示制造商。所有产品与性能数据仅用于功能演示。", {
      exact: true,
    }),
  ).toBeVisible();

  const draftResponse = await page.goto(
    "/en/products/TQ-DF-9000/draft-fuel-filter",
  );
  expect(draftResponse?.status()).toBe(404);
});

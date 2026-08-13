import { expect, test } from "@playwright/test";

test("海外采购者输入产品编号后直接进入当前语言的产品详情", async ({ page }) => {
  await page.goto("/en");
  await page
    .getByRole("searchbox", { name: "Part or reference number" })
    .fill(" tq fl 4827 ");
  await page.getByRole("button", { name: "Find a filter" }).click();

  await expect(page).toHaveURL(
    /\/en\/products\/TQ-FL-4827\/high-efficiency-fuel-filter$/,
  );
  await expect(
    page.getByRole("heading", { exact: true, name: "TQ-FL-4827" }),
  ).toBeVisible();
});

test("海外采购者查看带虚构品牌标识的唯一参考号结果", async ({ page }) => {
  await page.goto("/en");
  await page
    .getByRole("searchbox", { name: "Part or reference number" })
    .fill("nfx 90-81");
  await page.getByRole("button", { name: "Find a filter" }).click();

  await expect(page).toHaveURL(/\/en\/products\?part=nfx\+90-81$/);
  await expect(
    page.getByRole("heading", { name: "1 cross-reference match" }),
  ).toBeVisible();
  await expect(page.getByText("Novera", { exact: true })).toBeVisible();
  await expect(page.getByText("NFX-9081", { exact: true })).toBeVisible();
  await expect(page.getByText("TQ-FL-4827", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Cross-reference result", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Current unit: Metric")).toBeVisible();
  await expect(page.getByText("Outer diameter")).toBeVisible();
});

test("海外采购者看到歧义参考号的全部标准替换件", async ({ page }) => {
  await page.goto("/zh-cn/products?part=arv+44-00");

  await expect(
    page.getByRole("heading", { name: "2 项参考号匹配" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "TQ-AF-2106" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "TQ-CF-3021" }),
  ).toBeVisible();
  await expect(page.getByText("ARV-4400", { exact: true })).toHaveCount(2);
});

test("相似但不同的号码不匹配并提供继续查找路径", async ({ page }) => {
  await page.goto("/en");
  await page
    .getByRole("searchbox", { name: "Part or reference number" })
    .fill("NFX-9082");
  await page.getByRole("button", { name: "Find a filter" }).click();

  await expect(
    page.getByRole("heading", { name: "No exact match found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Part or reference number" }),
  ).toHaveValue("NFX-9082");
  await expect(
    page.getByRole("link", { name: "Browse categories" }),
  ).toHaveAttribute("href", "/en/products#categories");
  await expect(
    page.getByRole("link", { name: "Search by vehicle" }),
  ).toHaveAttribute("href", "/en?finder=vehicle#products");
  await expect(
    page.getByRole("link", { name: "Send a general inquiry" }),
  ).toHaveAttribute(
    "href",
    "mailto:inquiries@torquelis.example?subject=General%20inquiry",
  );
  await expect(page.getByText("TQ-FL-4827", { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Search by vehicle" }).click();
  await expect(
    page.getByRole("tab", { exact: true, name: "VEHICLE" }),
  ).toHaveAttribute("aria-selected", "true");
});

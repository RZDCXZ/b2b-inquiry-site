import { expect, test } from "@playwright/test";

test("海外采购者从空白车型条件逐级找到唯一标准替换件并进入详情", async ({
  page,
}) => {
  await page.goto("/en");
  await page.getByRole("tab", { exact: true, name: "VEHICLE" }).click();

  const make = page.getByRole("combobox", { name: /^Brand/ });
  const model = page.getByRole("combobox", { name: /^Model/ });
  const year = page.getByRole("combobox", { name: /^Year/ });
  const engine = page.getByRole("combobox", { name: /^Engine/ });
  const category = page.getByRole("combobox", {
    name: /^Filter category/,
  });

  await expect(make).toHaveValue("");
  await expect(model).toBeDisabled();
  await expect(year).toBeDisabled();
  await expect(engine).toBeDisabled();
  await expect(category).toBeDisabled();

  await make.selectOption({ label: "Northline" });
  await expect(model).toBeEnabled();
  await expect(model.getByRole("option", { name: "HX9" })).toHaveCount(1);
  await expect(model.getByRole("option", { name: "AT8" })).toHaveCount(0);

  await model.selectOption({ label: "HX9" });
  await expect(year).toBeEnabled();
  await year.selectOption("2022");

  await expect(engine).toBeEnabled();
  await expect(engine.getByRole("option", { name: "N13-420" })).toHaveCount(1);
  await expect(engine.getByRole("option", { name: "A11-390" })).toHaveCount(0);
  await engine.selectOption({ label: "N13-420" });

  await expect(category).toBeEnabled();
  await category.selectOption({ label: "Fuel filters" });
  await page.getByRole("button", { name: "Show matching filters" }).click();

  await expect(page).toHaveURL(
    /\/en\/products\?finder=vehicle&make=make-northline&model=model-northline-hx9&year=2022&engine=engine-n13-420&category=fuel$/,
  );
  await expect(page.getByText("1 published product")).toBeVisible();
  await expect(page.getByText("Vehicle fitment results")).toBeVisible();
  await expect(page.getByText("Current unit: Metric")).toBeVisible();
  await expect(page.getByText("Northline HX9")).toBeVisible();
  await expect(page.getByText("2022 · N13-420")).toBeVisible();

  await page
    .getByRole("link", {
      name: "View product: TQ-FL-4827 — High-Efficiency Fuel Filter",
    })
    .click();

  await expect(page).toHaveURL(
    /\/en\/products\/TQ-FL-4827\/high-efficiency-fuel-filter$/,
  );
  await expect(
    page.getByRole("heading", { exact: true, name: "TQ-FL-4827" }),
  ).toBeVisible();
});

test("无匹配车型结果保留查找器并提供三个恢复入口", async ({ page }) => {
  await page.goto(
    "/en/products?finder=vehicle&make=make-northline&model=model-northline-hx9&year=2022&engine=engine-a11-390&category=fuel",
  );

  await expect(
    page.getByRole("heading", { name: "No matching filters" }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Brand" })).toHaveValue(
    "make-northline",
  );
  const clearFilters = page.getByRole("link", { name: "Clear filters" });
  const searchByNumber = page.getByRole("link", { name: "Search by number" });
  const generalInquiry = page.getByRole("link", {
    name: "Send a general inquiry",
  });

  await expect(clearFilters).toBeVisible();
  await expect(clearFilters).toHaveAttribute("href", "/en/products");
  await expect(searchByNumber).toBeVisible();
  await expect(searchByNumber).toHaveAttribute(
    "href",
    "/en?finder=part#products",
  );
  await expect(generalInquiry).toBeVisible();
  await expect(generalInquiry).toHaveAttribute(
    "href",
    "mailto:inquiries@torquelis.example?subject=General%20inquiry",
  );
});

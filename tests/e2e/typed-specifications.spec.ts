import { expect, test } from "@playwright/test";

test("海外采购者切换产品规格单位后刷新仍保留明确标识的英制换算值", async ({
  page,
}) => {
  await page.goto("/en/products/TQ-FL-4827/high-efficiency-fuel-filter");

  await expect(
    page.getByRole("heading", { name: "Full specifications" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Outer diameter 96 mm/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Connection specification M16 × 1.5/ }),
  ).toBeVisible();

  await page.getByRole("link", { exact: true, name: "Imperial" }).click();

  await expect(page).toHaveURL(/\?unit=imperial$/);
  await expect(
    page.getByRole("row", { name: /Outer diameter 3.78 in Converted/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Rated flow 1.37 US gal\/min Converted/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Connection specification M16 × 1.5/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row", { name: /Connection specification M16 × 1.5/ })
      .getByText("Converted"),
  ).toHaveCount(0);

  await page.reload();

  await expect(page).toHaveURL(/\?unit=imperial$/);
  await expect(
    page.getByRole("row", { name: /Outer diameter 3.78 in Converted/ }),
  ).toBeVisible();
  await expect(
    page
      .getByText("Demo data — not for selection or purchasing.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
});

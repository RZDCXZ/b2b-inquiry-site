import { expect, test, type Page } from "@playwright/test";

import { createPrismaClient } from "@/src/infrastructure/database/prisma";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";

async function openSpecificationFiltersIfCollapsed(page: Page) {
  const categorySelect = page.getByRole("combobox", {
    name: "Filter category",
  });

  if (!(await categorySelect.isVisible())) {
    await page
      .getByRole("button", { name: /Open specification filters/ })
      .click();
  }
}

test("海外采购者从分类入口提交可分享的规格条件", async ({ page }) => {
  await page.goto("/en");
  await page
    .getByRole("tab", { exact: true, name: "CATEGORY & SPECS" })
    .click();
  const categorySelect = page.getByRole("combobox", {
    name: "Filter category",
  });
  if (!(await categorySelect.isVisible())) {
    await page
      .getByRole("button", { name: /Open specification filters/ })
      .click();
  }
  await categorySelect.selectOption("fuel");

  await expect(page).toHaveURL(
    "/en/products?finder=specifications&category=fuel&unit=metric&page=1",
  );
  const constructionType = page.getByRole("combobox", {
    name: "Construction type",
  });
  if (!(await constructionType.isVisible())) {
    await page
      .getByRole("button", { name: /Open specification filters/ })
      .click();
  }
  await constructionType.selectOption("spin_on");
  await page
    .getByRole("spinbutton", { name: "Outer diameter minimum" })
    .fill("95");
  await page
    .getByRole("spinbutton", { name: "Outer diameter maximum" })
    .fill("97");
  await page.getByRole("button", { name: "Apply specifications" }).click();

  await expect(page).toHaveURL(
    "/en/products?finder=specifications&unit=metric&page=1&category=fuel&spec.construction_type=spin_on&spec.outer_diameter.min=95&spec.outer_diameter.max=97",
  );
  await expect(page.getByText("TQ-FL-4827", { exact: true })).toBeVisible();
});

test("海外采购者从 URL 恢复分类、范围、枚举和英制显示", async ({ page }) => {
  const sharedUrl =
    "/en/products?finder=specifications&category=fuel&unit=imperial&page=1&spec.outer_diameter.min=95&spec.outer_diameter.max=97&spec.construction_type=spin_on";

  await page.goto(sharedUrl);

  await expect(
    page.getByRole("tab", { exact: true, name: "CATEGORY & SPECS" }),
  ).toHaveAttribute("aria-selected", "true");
  await openSpecificationFiltersIfCollapsed(page);
  await expect(
    page.getByRole("combobox", { name: "Filter category" }),
  ).toHaveValue("fuel");
  await expect(
    page.getByRole("combobox", { name: "Construction type" }),
  ).toHaveValue("spin_on");
  await expect(
    page.getByRole("spinbutton", { name: "Outer diameter minimum" }),
  ).toHaveValue("3.74");
  await expect(
    page.getByRole("spinbutton", { name: "Outer diameter maximum" }),
  ).toHaveValue("3.82");
  await expect(page.getByText("Current unit: Imperial")).toBeVisible();
  await expect(page.getByText("TQ-FL-4827", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Outer diameter 3.78 in", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Converted", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Connection specification" }),
  ).toHaveCount(0);

  const metricButton = page.getByRole("button", {
    exact: true,
    name: "Metric",
  });
  if (!(await metricButton.isVisible())) {
    await page
      .getByRole("button", { name: /Open specification filters/ })
      .click();
  }
  await metricButton.click();
  await expect(page).toHaveURL(/unit=metric/);
  await openSpecificationFiltersIfCollapsed(page);
  await expect(
    page.getByRole("spinbutton", { name: "Outer diameter minimum" }),
  ).toHaveValue("95");
  const imperialButton = page.getByRole("button", {
    exact: true,
    name: "Imperial",
  });
  if (!(await imperialButton.isVisible())) {
    await page
      .getByRole("button", { name: /Open specification filters/ })
      .click();
  }
  await imperialButton.click();
  await expect(page).toHaveURL(sharedUrl);

  await page.reload();

  await expect(page).toHaveURL(sharedUrl);
  await openSpecificationFiltersIfCollapsed(page);
  await expect(
    page.getByRole("spinbutton", { name: "Outer diameter minimum" }),
  ).toHaveValue("3.74");
  await expect(
    page.getByRole("combobox", { name: "Construction type" }),
  ).toHaveValue("spin_on");
});

test("规格无结果时保留条件并提供三个恢复入口", async ({ page }) => {
  const noResultUrl =
    "/en/products?finder=specifications&category=fuel&unit=metric&page=1&spec.outer_diameter.min=200&spec.construction_type=spin_on";

  await page.goto(noResultUrl);

  await expect(
    page.getByRole("heading", { name: "No matching filters" }),
  ).toBeVisible();
  await openSpecificationFiltersIfCollapsed(page);
  await expect(
    page.getByRole("spinbutton", { name: "Outer diameter minimum" }),
  ).toHaveValue("200");
  await expect(
    page.getByRole("combobox", { name: "Construction type" }),
  ).toHaveValue("spin_on");
  await expect(page).toHaveURL(noResultUrl);

  await expect(
    page.getByRole("link", { name: "Clear filters" }),
  ).toHaveAttribute(
    "href",
    "/en/products?finder=specifications&category=fuel&unit=metric&page=1",
  );
  await expect(
    page.getByRole("link", { name: "Search by number" }),
  ).toHaveAttribute("href", "/en?finder=part#products");
  await expect(
    page.getByRole("link", { name: "Send a general inquiry" }),
  ).toHaveAttribute("href", "/en/inquiry");
});

test("过期、跨分类和非法 URL 条件显示可理解反馈", async ({ page }) => {
  await page.goto(
    "/en/products?finder=specifications&category=fuel&unit=sideways&page=stale&spec.media_type=synthetic&spec.retired_size.min=10",
  );

  const feedback = page.getByRole("status");
  await expect(feedback).toContainText("Some shared filters need attention");
  await expect(feedback).toContainText(
    "A specification does not belong to the selected category.",
  );
  await expect(feedback).toContainText(
    "This specification filter is no longer available.",
  );
  await expect(feedback).toContainText(
    "The unit preference is invalid; Metric is shown.",
  );
  await expect(feedback).toContainText(
    "The page number is invalid; page 1 is shown.",
  );
  await expect(page.getByText("TQ-FL-4827", { exact: true })).toBeVisible();
});

test("规格结果固定每页十二项并通过 URL 进入下一页", async ({
  page,
}, testInfo) => {
  const prisma = createPrismaClient(databaseUrl);
  const projectToken = testInfo.project.name.replaceAll(/[^a-z0-9]/gi, "-");
  const projectValues: Record<string, number> = {
    chromium: 710,
    "chromium-mobile": 720,
    firefox: 730,
    "firefox-mobile": 740,
    webkit: 750,
    "webkit-mobile": 760,
  };
  const outerDiameter = projectValues[testInfo.project.name] ?? 790;
  const fixtures = Array.from({ length: 13 }, (_, index) => {
    const suffix = String(index).padStart(2, "0");
    return {
      partNumber: `TQ-PG-${projectToken}-${suffix}`.toUpperCase(),
      productId: `product-pagination-browser-${projectToken}-${suffix}`,
      publicationId: `publication-pagination-browser-${projectToken}-${suffix}-v1`,
    };
  });

  await prisma.$transaction(async (transaction) => {
    for (const fixture of fixtures) {
      await transaction.product.create({
        data: {
          categoryId: "category-fuel",
          id: fixture.productId,
          imagePath: "/assets/fuel-filter-product.png",
          partNumber: fixture.partNumber,
          publications: {
            create: {
              id: fixture.publicationId,
              nameEn: `Browser pagination fixture ${fixture.partNumber}`,
              nameZhCn: `浏览器分页测试 ${fixture.partNumber}`,
              slugEn: `browser-pagination-${fixture.partNumber.toLowerCase()}`,
              slugZhCn: `浏览器分页-${fixture.partNumber}`,
              summaryEn: "Browser-only pagination fixture.",
              summaryZhCn: "仅用于浏览器分页测试。",
              version: 1,
            },
          },
        },
      });
      await transaction.product.update({
        data: {
          currentPublicationId: fixture.publicationId,
          status: "published",
        },
        where: { id: fixture.productId },
      });
      await transaction.productSpecificationValue.create({
        data: {
          attributeCode: "outer_diameter",
          attributeId: "specification-fuel-outer_diameter",
          baseUnit: "millimetre",
          dataType: "decimal",
          decimalValue: outerDiameter,
          nameEn: "Outer diameter",
          nameZhCn: "外径",
          position: 1,
          publicationId: fixture.publicationId,
        },
      });
    }
  });

  try {
    await page.goto(
      `/en/products?finder=specifications&category=fuel&unit=metric&page=1&spec.outer_diameter.min=${outerDiameter}&spec.outer_diameter.max=${outerDiameter}`,
    );

    await expect(page.locator(".catalog-card")).toHaveCount(12);
    await expect(
      page.getByText(fixtures[0].partNumber, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(fixtures[11].partNumber, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(fixtures[12].partNumber, { exact: true }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: "Next page" }).click();

    await expect(page).toHaveURL(/&page=2&/);
    await expect(page.locator(".catalog-card")).toHaveCount(1);
    await expect(
      page.getByText(fixtures[12].partNumber, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  } finally {
    await prisma.product.deleteMany({
      where: { id: { in: fixtures.map(({ productId }) => productId) } },
    });
    await prisma.$disconnect();
  }
});

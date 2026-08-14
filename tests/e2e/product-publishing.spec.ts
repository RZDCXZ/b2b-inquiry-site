import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { readPresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";

function projectSuffix(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/gu, "-");
}

async function createDraftFixture(suffix: string) {
  const prisma = createPrismaClient(databaseUrl);
  const source = await prisma.product.findUniqueOrThrow({
    include: {
      currentPublication: {
        include: {
          fitments: true,
          references: true,
          specificationValues: true,
        },
      },
    },
    where: { id: "product-tq-fl-4827" },
  });
  const sourcePublication = source.currentPublication!;
  const productId = "product-ticket-13-" + suffix;
  const partNumber = "TQ-T13-" + suffix.toUpperCase();
  const initialNameEn = "Browser Draft " + suffix;
  const initialNameZhCn = "浏览器草稿 " + suffix;
  const slugEn = "browser-draft-" + suffix;
  const specifications = sourcePublication.specificationValues.map((value) => ({
    code: value.attributeCode,
    dataType: value.dataType,
    label: value.nameZhCn,
    value:
      value.dataType === "decimal"
        ? (value.decimalValue?.toString() ?? "")
        : value.dataType === "boolean"
          ? String(value.booleanValue)
          : value.dataType === "enumeration"
            ? (value.enumerationValue ?? "")
            : (value.textValue ?? ""),
  }));

  await prisma.product.create({
    data: {
      categoryId: source.categoryId,
      id: productId,
      imagePath: source.imagePath,
      partNumber,
      status: "draft",
    },
  });
  await prisma.productDraft.create({
    data: {
      categoryId: source.categoryId,
      descriptionEn: "Complete browser draft for product publishing.",
      descriptionZhCn: "用于产品发布浏览器测试的完整草稿。",
      fitmentSummaryEn: sourcePublication.fitmentSummaryEn,
      fitmentSummaryZhCn: sourcePublication.fitmentSummaryZhCn,
      fitments: {
        createMany: {
          data: sourcePublication.fitments.map(
            ({ engineId, vehicleModelId, yearFrom, yearTo }) => ({
              engineId,
              id: randomUUID(),
              vehicleModelId,
              yearFrom,
              yearTo,
            }),
          ),
        },
      },
      imageAltEn: initialNameEn + " product image",
      imageAltZhCn: initialNameZhCn + "产品图片",
      imagePath: source.imagePath,
      nameEn: initialNameEn,
      nameZhCn: initialNameZhCn,
      productId,
      references: {
        create: {
          brand: "Novera",
          referenceNumber: "T13-" + suffix,
        },
      },
      seoDescriptionEn: "Browser draft publishing demonstration.",
      seoDescriptionZhCn: "浏览器草稿发布演示。",
      seoTitleEn: initialNameEn + " | Torquelis Filters",
      seoTitleZhCn: initialNameZhCn + "｜拓擎利滤清",
      slugEn,
      slugZhCn: "浏览器草稿-" + suffix,
      status: "published",
      summaryEn: "Draft content is visible only in preview before publishing.",
      summaryZhCn: "发布前只有预览可以看到这份草稿内容。",
      version: 1,
    },
  });

  return {
    close: () => prisma.$disconnect(),
    initialNameEn,
    initialNameZhCn,
    partNumber,
    prisma,
    productId,
    slugEn,
    specifications,
  };
}

async function loginAsContentEditor(page: Page) {
  const credentials = await readPresetCredentials();
  const editor = credentials.accounts.find(
    ({ role }) => role === "content_editor",
  )!;

  await page.goto("/admin/login");
  await page.getByLabel("邮箱").fill(editor.email);
  await page.getByLabel("密码").fill(editor.password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/admin$/u);
}

async function openEnglishTab(page: Page) {
  await page.getByRole("tab", { name: "English" }).click();
}

async function fillSpecifications(
  page: Page,
  specifications: Awaited<
    ReturnType<typeof createDraftFixture>
  >["specifications"],
) {
  for (const specification of specifications) {
    const field = page.locator("#specification-" + specification.code);

    if (
      specification.dataType === "boolean" ||
      specification.dataType === "enumeration"
    ) {
      await field.selectOption(specification.value);
    } else {
      await field.fill(specification.value);
    }
  }
}

test("内容编辑预览、发布、恢复并处理草稿并发冲突", async ({
  browser,
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const suffix = projectSuffix(testInfo.project.name);
  const fixture = await createDraftFixture(suffix);
  const editorPath =
    "/admin/products/" + encodeURIComponent(fixture.partNumber);
  const publicPath =
    "/en/products/" +
    encodeURIComponent(fixture.partNumber) +
    "/" +
    fixture.slugEn;
  const firstPublishedName = "First Published " + suffix;
  const secondPublishedName = "Second Published " + suffix;

  try {
    await loginAsContentEditor(page);
    await page.goto(editorPath);
    await expect(
      page.getByRole("heading", { name: fixture.initialNameZhCn }),
    ).toBeVisible();
    await fillSpecifications(page, fixture.specifications);

    await openEnglishTab(page);
    await page.getByLabel("Product name").fill(firstPublishedName);
    await page.getByRole("tab", { name: "简体中文" }).click();
    await page.getByLabel("产品名称").fill("");
    await page.getByLabel("短描述").fill("");
    await page.getByRole("button", { name: "保存草稿" }).click();
    await expect(page.getByText("草稿 v2")).toBeVisible();

    const sitemapBeforePreviewResponse = await page.request.get("/sitemap.xml");
    expect(sitemapBeforePreviewResponse.status()).toBe(404);

    const previewPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "英文预览" }).click();
    const preview = await previewPromise;
    await expect(
      preview.getByText(
        "This view reads the current draft and does not change the public version or sitemap.",
      ),
    ).toBeVisible();
    await expect(
      preview.getByRole("heading", { name: firstPublishedName }),
    ).toBeVisible();
    await preview.close();

    expect((await page.request.get("/sitemap.xml")).status()).toBe(404);

    expect((await page.request.get(publicPath)).status()).toBe(404);
    await page.getByRole("button", { name: "发布产品" }).click();
    await expect(page.getByText("产品尚未满足发布条件。")).toBeVisible();
    await expect(
      page.getByRole("alert").filter({
        hasText: "产品尚未满足发布条件。",
      }),
    ).toBeFocused();
    await expect(
      page.getByRole("link", {
        name: "简体中文 / 产品名称：此公开字段为必填项。",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "简体中文 / 短描述：此公开字段为必填项。",
      }),
    ).toBeVisible();

    await page.getByLabel("产品名称").fill("首次发布 " + suffix);
    await page.getByLabel("短描述").fill("首次发布的中文短描述。" + suffix);
    await page.getByRole("button", { name: "保存草稿" }).click();
    await expect(page.getByText("草稿 v3")).toBeVisible();
    await page.getByRole("button", { name: "发布产品" }).click();
    await expect(page.getByText("已创建不可变公开版本 v1。")).toBeVisible();
    expect((await page.request.get("/sitemap.xml")).status()).toBe(404);

    await page.goto(publicPath);
    await expect(
      page.getByRole("heading", { name: firstPublishedName }),
    ).toBeVisible();

    await page.goto(editorPath);
    await openEnglishTab(page);
    await page.getByLabel("Product name").fill(secondPublishedName);
    await page.getByRole("button", { name: "保存草稿" }).click();
    await expect(page.getByText("草稿 v4")).toBeVisible();
    await page.getByRole("button", { name: "发布产品" }).click();
    await expect(page.getByText("已创建不可变公开版本 v2。")).toBeVisible();

    await page.goto(publicPath);
    await expect(
      page.getByRole("heading", { name: secondPublishedName }),
    ).toBeVisible();

    await page.goto(editorPath);
    const versionOne = page
      .locator(".product-version-history article")
      .filter({ hasText: "v1" });
    const restoreTrigger = versionOne.getByRole("button", {
      name: "恢复为新草稿",
    });
    await restoreTrigger.click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(restoreTrigger).toBeFocused();
    await restoreTrigger.click();
    await page.getByRole("button", { name: "确认恢复为新草稿" }).click();
    await expect(
      page.getByRole("heading", { name: "首次发布 " + suffix }),
    ).toBeVisible();

    await page.goto(publicPath);
    await expect(
      page.getByRole("heading", { name: secondPublishedName }),
    ).toBeVisible();

    await page.goto(editorPath);
    await page.getByRole("button", { name: "发布产品" }).click();
    await expect(page.getByText("已创建不可变公开版本 v3。")).toBeVisible();
    await page.goto(publicPath);
    await expect(
      page.getByRole("heading", { name: firstPublishedName }),
    ).toBeVisible();

    await page.goto(editorPath);
    const staleContext = await browser.newContext({
      baseURL: new URL(page.url()).origin,
    });
    const stalePage = await staleContext.newPage();
    await loginAsContentEditor(stalePage);
    await stalePage.goto(editorPath);

    await openEnglishTab(page);
    await page
      .getByLabel("Short description")
      .fill("The winning concurrent browser edit.");
    await page.getByRole("button", { name: "保存草稿" }).click();
    await expect(page.getByText("草稿 v6")).toBeVisible();

    await openEnglishTab(stalePage);
    await stalePage
      .getByLabel("Short description")
      .fill("This stale browser edit must be rejected.");
    await stalePage.getByRole("button", { name: "保存草稿" }).click();
    await expect(
      stalePage.getByText("草稿已由其他窗口更新，本次保存未覆盖较新内容。"),
    ).toBeVisible();
    await expect(stalePage.getByText(/最新修改：王晴/u)).toBeVisible();
    const staleVersionOne = stalePage
      .locator(".product-version-history article")
      .filter({ hasText: "v1" });
    await staleVersionOne.getByRole("button", { name: "恢复为新草稿" }).click();
    const restoreConflictDialog = stalePage.getByRole("alertdialog");
    await restoreConflictDialog
      .getByRole("button", { name: "确认恢复为新草稿" })
      .click();
    await expect(
      restoreConflictDialog.getByText(
        "草稿已由其他窗口更新，本次保存未覆盖较新内容。",
      ),
    ).toBeVisible();
    await staleContext.close();
  } finally {
    await fixture.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT set_config(
          'torquelis.allow_product_publication_mutation',
          'on',
          true
        )
      `;
      await transaction.auditLog.deleteMany({
        where: { targetId: fixture.productId },
      });
      await transaction.product.update({
        data: { currentPublicationId: null, status: "draft" },
        where: { id: fixture.productId },
      });
      await transaction.product.deleteMany({
        where: { id: fixture.productId },
      });
    });
    await fixture.close();
  }
});

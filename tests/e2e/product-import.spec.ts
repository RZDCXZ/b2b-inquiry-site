import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

import { createProductImportTemplate } from "@/src/application/product-import";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { readPresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";
import { addFuelProductToImportWorkbook } from "@/tests/product-import-workbook-fixture";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const xlsxMime =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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

async function importWorkbook({
  invalid,
  newPartNumber,
  updatePartNumber,
}: {
  invalid: boolean;
  newPartNumber: string;
  updatePartNumber: string;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await createProductImportTemplate()) as never);
  addFuelProductToImportWorkbook(workbook, {
    name: "Browser updated import",
    partNumber: updatePartNumber,
    slug: `browser-updated-${updatePartNumber.toLocaleLowerCase()}`,
  });
  addFuelProductToImportWorkbook(workbook, {
    name: "Browser new import",
    partNumber: newPartNumber,
    slug: `browser-new-${newPartNumber.toLocaleLowerCase()}`,
  });
  if (invalid) {
    workbook
      .getWorksheet("产品")!
      .addRow([
        updatePartNumber,
        "fuel",
        "/assets/fuel-filter-product.png",
        "published",
        "",
      ]);
    workbook
      .getWorksheet("规格值")!
      .addRow([updatePartNumber, "unknown_attribute", 99, "millimetre"]);
    workbook
      .getWorksheet("参考号")!
      .addRow(["TQ-MISSING", "Novera", "MISSING-REF"]);
    workbook
      .getWorksheet("适配关系")!
      .addRow([updatePartNumber, "Northline", "HX9", "UNKNOWN", 2025, 2020]);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("内容编辑校验导入后可整批撤销、确定性重导入并原子批量发布", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const prisma = createPrismaClient(databaseUrl);
  const suffix = `${testInfo.project.name.toLocaleLowerCase().replace(/[^a-z0-9]+/gu, "-")}-${randomUUID().slice(0, 6)}`;
  const existingProductId = `product-import-browser-update-${suffix}`;
  const updatePartNumber = `TQ-I16-U-${suffix.toUpperCase()}`;
  const newPartNumber = `TQ-I16-N-${suffix.toUpperCase()}`;
  const invalidFilename = `ticket-16-errors-${suffix}.xlsx`;
  const validFilename = `ticket-16-valid-${suffix}.xlsx`;

  await prisma.product.create({
    data: {
      categoryId: "category-fuel",
      id: existingProductId,
      imagePath: "/assets/fuel-filter-product.png",
      partNumber: updatePartNumber,
      status: "draft",
    },
  });
  await prisma.productDraft.create({
    data: {
      categoryId: "category-fuel",
      descriptionEn: "Existing browser import draft.",
      descriptionZhCn: "已有浏览器导入草稿。",
      fitmentSummaryEn: "Existing fitment summary.",
      fitmentSummaryZhCn: "已有适配摘要。",
      imageAltEn: "Existing browser image",
      imageAltZhCn: "已有浏览器图片",
      imagePath: "/assets/fuel-filter-product.png",
      nameEn: "Existing browser import",
      nameZhCn: "已有浏览器导入",
      productId: existingProductId,
      seoDescriptionEn: "Existing browser SEO description.",
      seoDescriptionZhCn: "已有浏览器 SEO 描述。",
      seoTitleEn: "Existing browser import | Torquelis",
      seoTitleZhCn: "已有浏览器导入｜拓擎利",
      slugEn: `existing-browser-import-${suffix}`,
      slugZhCn: `已有浏览器导入-${suffix}`,
      status: "published",
      summaryEn: "Existing browser summary.",
      summaryZhCn: "已有浏览器摘要。",
      version: 3,
    },
  });

  try {
    await loginAsContentEditor(page);
    await page.goto("/admin/import");
    await expect(
      page.getByRole("heading", { name: "上传并校验 Excel" }),
    ).toBeVisible();
    await page
      .getByLabel("工作簿文件")
      .evaluate((input) => input.removeAttribute("required"));
    await page.getByRole("button", { name: "上传并校验" }).click();
    const uploadError = page
      .getByRole("alert")
      .filter({ hasText: "请选择一个 .xlsx 工作簿。" });
    await expect(uploadError).toBeFocused();
    await uploadError.getByRole("link", { name: "检查文件字段" }).click();
    await expect(page.getByLabel("工作簿文件")).toBeFocused();
    await page
      .getByLabel("工作簿文件")
      .evaluate((input) => input.removeAttribute("required"));
    await page.getByRole("button", { name: "上传并校验" }).click();
    await expect(uploadError).toBeFocused();
    const templateDownload = page.waitForEvent("download");
    await page.getByRole("link", { name: "下载模板与字段说明" }).click();
    await expect((await templateDownload).suggestedFilename()).toBe(
      "torquelis-product-import-template.xlsx",
    );

    await page.getByLabel("工作簿文件").setInputFiles({
      buffer: await importWorkbook({
        invalid: true,
        newPartNumber,
        updatePartNumber,
      }),
      mimeType: xlsxMime,
      name: invalidFilename,
    });
    await page.getByRole("button", { name: "上传并校验" }).click();
    await expect(page).toHaveURL(/\/admin\/import\/previews\//u);
    await expect(page.getByText("整批导入已暂停")).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "PRODUCT_NUMBER_DUPLICATE" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", {
        name: "SPECIFICATION_ATTRIBUTE_NOT_FOUND",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "PRODUCT_ROW_MISSING" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "FITMENT_NOT_FOUND" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "FITMENT_YEAR_RANGE_INVALID" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "确认导入草稿" }),
    ).toBeDisabled();
    await page.getByLabel("工作表").selectOption("产品");
    await page.getByLabel("错误代码").selectOption("FITMENT_NOT_FOUND");
    await page.getByRole("button", { name: "筛选错误" }).click();
    await expect(page.getByText("当前筛选没有匹配错误")).toBeVisible();
    await page.getByRole("link", { name: "查看全部业务错误" }).click();
    await expect(
      page.getByRole("cell", { name: "PRODUCT_NUMBER_DUPLICATE" }),
    ).toBeVisible();
    const reportDownload = page.waitForEvent("download");
    await page.getByRole("link", { name: "下载错误报告" }).click();
    await expect((await reportDownload).suggestedFilename()).toMatch(
      /^torquelis-import-errors-.*\.xlsx$/u,
    );

    await page.getByRole("link", { name: "重新上传" }).click();
    await page.getByLabel("工作簿文件").setInputFiles({
      buffer: await importWorkbook({
        invalid: false,
        newPartNumber,
        updatePartNumber,
      }),
      mimeType: xlsxMime,
      name: validFilename,
    });
    await page.getByRole("button", { name: "上传并校验" }).click();
    await expect(page.getByText("全部校验通过")).toBeVisible();
    await expect(page.getByText("可以确认导入")).toBeVisible();
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("已有浏览器导入", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("产品名称（英文）")).toBeVisible();
    await expect(page.getByText("规格 · outer_diameter")).toBeVisible();
    await expect(
      page.getByText("Browser updated import 中文", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "确认导入草稿" }).click();
    await expect(page).toHaveURL(/\/admin\/import\/batches\//u);
    await expect(
      page.getByRole("heading", {
        name: "草稿导入成功，公开页面保持不变",
      }),
    ).toBeVisible();
    await expect(page.getByText("新增 1 个草稿，更新 1 个草稿")).toBeVisible();
    await expect(page.getByText("当前可安全整批撤销")).toBeVisible();
    await page.getByRole("button", { exact: true, name: "整批撤销" }).click();
    await expect(
      page.getByRole("heading", { name: "确认整批撤销？" }),
    ).toBeVisible();
    await page
      .getByRole("button", { exact: true, name: "确认整批撤销" })
      .click();
    await expect(page).toHaveURL(/notice=rolled-back/u);
    await expect(page.getByText("批次已撤销", { exact: true })).toBeVisible();
    await expect(
      prisma.product.findUnique({
        where: {
          normalizedPartNumber: newPartNumber
            .replace(/[\s-]/gu, "")
            .toUpperCase(),
        },
      }),
    ).resolves.toBeNull();

    await page.getByRole("link", { name: "再次导入" }).click();
    await page.getByLabel("工作簿文件").setInputFiles({
      buffer: await importWorkbook({
        invalid: false,
        newPartNumber,
        updatePartNumber,
      }),
      mimeType: xlsxMime,
      name: validFilename,
    });
    await page.getByRole("button", { name: "上传并校验" }).click();
    await expect(page.getByText("全部校验通过")).toBeVisible();
    await page.getByRole("button", { name: "确认导入草稿" }).click();
    await expect(page.getByText("当前可安全整批撤销")).toBeVisible();
    await page.getByRole("button", { name: "预览批量发布" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/publish\?/u);
    await expect(
      page.getByRole("heading", { name: "批量发布预览 · 2 个草稿" }),
    ).toBeVisible();
    await expect(page.getByText("全部通过，可以原子批量发布")).toBeVisible();
    await page.getByRole("button", { name: "原子发布全部 2 个草稿" }).click();
    await expect(page).toHaveURL(/notice=bulk-published/u);
    await expect(
      page.getByText("已在一个事务中发布 2 个产品草稿"),
    ).toBeVisible();
    await expect(page.getByText(newPartNumber, { exact: true })).toBeVisible();
    await expect(
      page.getByText(updatePartNumber, { exact: true }),
    ).toBeVisible();
  } finally {
    const previews = await prisma.productImportPreview.findMany({
      select: { batch: { select: { id: true } }, id: true },
      where: { originalFilename: { in: [invalidFilename, validFilename] } },
    });
    const batchIds = previews.flatMap(({ batch }) => (batch ? [batch.id] : []));
    const normalizedPartNumbers = [updatePartNumber, newPartNumber].map(
      (value) => value.replace(/[\s-]/gu, "").toUpperCase(),
    );
    const productIds = (
      await prisma.product.findMany({
        select: { id: true },
        where: { normalizedPartNumber: { in: normalizedPartNumbers } },
      })
    ).map(({ id }) => id);
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        "SET LOCAL torquelis.allow_product_publication_mutation = 'on'",
      );
      await transaction.auditLog.deleteMany({
        where: {
          OR: [
            { targetId: { in: [...batchIds, ...productIds] } },
            {
              event: {
                in: [
                  "PRODUCT_BATCH_PUBLISHED",
                  "PRODUCT_BATCH_PUBLISH_REJECTED",
                ],
              },
              summary: { contains: updatePartNumber },
            },
          ],
        },
      });
      await transaction.product.updateMany({
        data: {
          currentPublicationId: null,
          replacementProductId: null,
          status: "draft",
        },
        where: { id: { in: productIds } },
      });
      await transaction.productPublication.deleteMany({
        where: { productId: { in: productIds } },
      });
      await transaction.productImportBatch.deleteMany({
        where: { id: { in: batchIds } },
      });
      await transaction.productImportPreview.deleteMany({
        where: { id: { in: previews.map(({ id }) => id) } },
      });
      await transaction.product.deleteMany({
        where: { id: { in: productIds } },
      });
    });
    await prisma.product.deleteMany({
      where: {
        normalizedPartNumber: { in: normalizedPartNumbers },
      },
    });
    await prisma.$disconnect();
  }
});

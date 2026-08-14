import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { publishProductDraft } from "@/src/application/product-publishing";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { deleteUploadedAsset } from "@/src/infrastructure/local-demo/uploaded-assets";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { readPresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const contentEditor: AdminActor = {
  id: "demo-user-content_editor",
  name: "王晴",
  role: "content_editor",
};

async function createReplacementPdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText("BROWSER REPLACEMENT DOCUMENT", { font });
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
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

async function createFixture(projectName: string) {
  const prisma = createPrismaClient(databaseUrl);
  const suffix = `${projectName.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-")}-${randomUUID().slice(0, 6)}`;
  const productId = `product-asset-browser-${suffix}`;
  const partNumber = `TQ-A14-${suffix.toUpperCase()}`;
  const slugEn = `safe-asset-filter-${suffix}`;
  const source = await prisma.product.findUniqueOrThrow({
    include: {
      draft: { include: { references: true, specificationValues: true } },
    },
    where: { id: "product-tq-fl-4827" },
  });
  const draft = source.draft!;

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
      categoryId: draft.categoryId,
      descriptionEn: "Browser fixture for safe document replacement.",
      descriptionZhCn: "用于安全资料替换浏览器验证的产品。",
      fitmentSummaryEn: "Selected demonstration applications.",
      fitmentSummaryZhCn: "适用于指定演示车型。",
      imageAltEn: "Safe asset filter product image",
      imageAltZhCn: "安全素材滤清器产品图片",
      imageAssetId: draft.imageAssetId,
      imagePath: draft.imagePath,
      nameEn: "Safe Asset Filter",
      nameZhCn: "安全素材滤清器",
      productId,
      references: {
        create: draft.references.map(({ brand, referenceNumber }) => ({
          brand,
          referenceNumber: `${referenceNumber}-${suffix}`,
        })),
      },
      seoDescriptionEn: "Browser fixture for safe document replacement.",
      seoDescriptionZhCn: "用于安全资料替换浏览器验证的产品。",
      seoTitleEn: "Safe Asset Filter | Torquelis Filters",
      seoTitleZhCn: "安全素材滤清器｜拓擎利滤清",
      slugEn,
      slugZhCn: `安全素材滤清器-${suffix}`,
      specificationValues: {
        create: draft.specificationValues.map((value) => {
          const { productId: sourceProductId, ...snapshot } = value;
          void sourceProductId;
          return snapshot;
        }),
      },
      status: "published",
      summaryEn: "A complete product draft for browser verification.",
      summaryZhCn: "用于浏览器验证的完整产品草稿。",
      version: 1,
    },
  });
  await publishProductDraft({
    actor: contentEditor,
    expectedDraftVersion: 1,
    partNumber,
    prisma,
  });

  return {
    cleanup: async () => {
      const documentAssets = await prisma.asset.findMany({
        select: { id: true, storageFilename: true },
        where: {
          OR: [
            { draftDocumentProducts: { some: { productId } } },
            { publicationDocumentProducts: { some: { productId } } },
          ],
        },
      });
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`
          SELECT set_config(
            'torquelis.allow_product_publication_mutation',
            'on',
            true
          )
        `;
        await transaction.product.delete({ where: { id: productId } });
        await transaction.asset.deleteMany({
          where: { id: { in: documentAssets.map(({ id }) => id) } },
        });
      });
      await Promise.all(
        documentAssets.map(({ storageFilename }) =>
          deleteUploadedAsset({ storageFilename }),
        ),
      );
      await prisma.$disconnect();
    },
    partNumber,
    prisma,
    slugEn,
    uploadFilename: `ticket-14-${suffix}.pdf`,
  };
}

test("内容编辑可见安全拒绝、资料新记录与发布引用保护", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const fixture = await createFixture(testInfo.project.name);
  const replacementBytes = await createReplacementPdf();

  try {
    await loginAsContentEditor(page);
    await page.goto("/admin/assets");
    await expect(page.getByRole("heading", { name: "素材管理" })).toBeVisible();

    await page.getByLabel("素材类型").selectOption("document");
    await page.getByLabel("选择文件").setInputFiles({
      buffer: Buffer.from("%PDF-1.7\ndisguised"),
      mimeType: "application/pdf",
      name: "disguised.jpg",
    });
    await page.getByRole("button", { name: "校验并创建素材" }).click();
    const validationAlert = page.getByRole("alert").filter({
      hasText: "文件扩展名与实际类型不一致。",
    });
    await expect(validationAlert).toBeVisible();
    await expect(validationAlert).toBeFocused();

    const generatedAsset = page
      .getByRole("article")
      .filter({ hasText: "fuel-filter-product.png" });
    await expect(
      generatedAsset.getByText(/发布版本 v1/u).first(),
    ).toBeVisible();
    await expect(
      generatedAsset.getByRole("button", { name: "删除素材" }),
    ).toBeDisabled();

    await page.goto(
      `/admin/products/${encodeURIComponent(fixture.partNumber)}`,
    );
    await page
      .getByLabel("选择新的中英双语 PDF 资料（最大 10 MiB）")
      .setInputFiles({
        buffer: replacementBytes,
        mimeType: "application/pdf",
        name: fixture.uploadFilename,
      });
    await page.getByRole("button", { name: "创建新资料并更新草稿" }).click();
    await expect(
      page.getByText(`当前草稿：${fixture.uploadFilename}`),
    ).toBeVisible();

    const beforePublish = await fixture.prisma.product.findFirstOrThrow({
      select: {
        currentPublication: { select: { documentAssetId: true } },
        draft: { select: { documentAssetId: true, version: true } },
      },
      where: { partNumber: fixture.partNumber },
    });
    expect(beforePublish.currentPublication?.documentAssetId).toBeNull();
    expect(beforePublish.draft?.documentAssetId).toBeTruthy();
    expect(beforePublish.draft?.version).toBe(2);

    await page.getByRole("button", { name: "发布产品" }).click();
    await expect(page.getByText("已创建不可变公开版本 v2。")).toBeVisible();

    const response = await page.request.get(
      `/en/products/${encodeURIComponent(fixture.partNumber)}/${fixture.slugEn}/specification.pdf`,
    );
    expect(response.status()).toBe(200);
    const publishedBytes = await response.body();
    expect(publishedBytes).not.toEqual(replacementBytes);
    await expect(PDFDocument.load(publishedBytes)).resolves.toBeDefined();

    await page.goto("/admin/assets");
    const uploadedAsset = page
      .getByRole("article")
      .filter({ hasText: fixture.uploadFilename });
    await expect(uploadedAsset).toContainText(fixture.partNumber);
    await expect(uploadedAsset).toContainText("发布版本 v2");
    await expect(
      uploadedAsset.getByRole("button", { name: "删除素材" }),
    ).toBeDisabled();
  } finally {
    await fixture.cleanup();
  }
});

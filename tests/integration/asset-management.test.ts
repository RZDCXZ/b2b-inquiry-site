import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { afterAll, describe, expect, it } from "vitest";

import {
  AssetManagementError,
  deleteAsset,
  listAssets,
  replaceProductDraftDocument,
  uploadAsset,
} from "@/src/application/asset-management";
import {
  generateProductDraftSpecificationPdf,
  generatePublishedProductSpecificationPdf,
} from "@/src/application/product-specification-pdf";
import { getPublishedProduct } from "@/src/application/public-catalog";
import {
  getProductDraft,
  publishProductDraft,
  saveProductDraft,
} from "@/src/application/product-publishing";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);
const contentEditor: AdminActor = {
  id: "demo-user-content_editor",
  name: "王晴",
  role: "content_editor",
};
const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

async function createReplacementPdf(label: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText(label, { font });
  return pdf.save({ useObjectStreams: false });
}

async function createPublishedFixture() {
  const suffix = randomUUID().slice(0, 8);
  const productId = `product-asset-${suffix}`;
  const partNumber = `TQ-AS-${suffix.toUpperCase()}`;
  const source = await prisma.product.findUniqueOrThrow({
    include: {
      draft: {
        include: { references: true, specificationValues: true },
      },
    },
    where: { id: "product-tq-fl-4827" },
  });
  const sourceDraft = source.draft!;

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
      categoryId: sourceDraft.categoryId,
      descriptionEn: "Asset replacement integration fixture.",
      descriptionZhCn: "素材替换集成测试数据。",
      fitmentSummaryEn: "Selected demonstration applications.",
      fitmentSummaryZhCn: "适用于指定演示车型。",
      imageAltEn: "Demonstration filter product image",
      imageAltZhCn: "演示滤清器产品图片",
      imageAssetId: sourceDraft.imageAssetId,
      imagePath: sourceDraft.imagePath,
      nameEn: "Asset Fixture Filter",
      nameZhCn: "素材测试滤清器",
      productId,
      references: {
        create: sourceDraft.references.map(({ brand, referenceNumber }) => ({
          brand,
          referenceNumber,
        })),
      },
      seoDescriptionEn: "Asset replacement integration fixture.",
      seoDescriptionZhCn: "素材替换集成测试数据。",
      seoTitleEn: "Asset Fixture Filter | Torquelis Filters",
      seoTitleZhCn: "素材测试滤清器｜拓擎利滤清",
      slugEn: `asset-fixture-${suffix}`,
      slugZhCn: `素材测试-${suffix}`,
      specificationValues: {
        create: sourceDraft.specificationValues.map((value) => {
          const { productId: sourceProductId, ...snapshot } = value;
          void sourceProductId;
          return snapshot;
        }),
      },
      status: "published",
      summaryEn: "A complete product used to verify immutable assets.",
      summaryZhCn: "用于验证不可变素材引用的完整产品。",
      version: 1,
    },
  });

  const publication = await publishProductDraft({
    actor: contentEditor,
    expectedDraftVersion: 1,
    partNumber,
    prisma,
  });

  return {
    cleanup: async (assetIds: string[]) => {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`
          SELECT set_config(
            'torquelis.allow_product_publication_mutation',
            'on',
            true
          )
        `;
        await transaction.product.delete({ where: { id: productId } });
        await transaction.asset.deleteMany({ where: { id: { in: assetIds } } });
      });
    },
    partNumber,
    publication,
    slugEn: `asset-fixture-${suffix}`,
  };
}

describe("安全素材与资料替换", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("路径型原文件名只生成随机本地文件名，且未引用上传可安全删除", async () => {
    const storageDirectory = await mkdtemp(
      path.join(os.tmpdir(), "torquelis-assets-"),
    );
    let assetId: string | undefined;

    try {
      const asset = await uploadAsset({
        actor: contentEditor,
        file: {
          bytes: pngBytes,
          declaredMimeType: "image/png",
          originalFilename: "../../private\\nested/product.png",
        },
        imageAltEn: "Fuel filter product image",
        imageAltZhCn: "燃油滤清器产品图片",
        kind: "image",
        prisma,
        storageDirectory,
      });
      assetId = asset.id;

      expect(asset.originalFilename).toBe("product.png");
      expect(asset.storageFilename).toMatch(/^[0-9a-f-]{36}\.png$/u);
      expect(asset.storageFilename).not.toContain("/");
      expect(asset.publicPath).toBe(`/media/assets/${asset.id}`);
      expect(
        await readFile(path.join(storageDirectory, asset.storageFilename)),
      ).toEqual(Buffer.from(pngBytes));
      expect(
        (await listAssets({ actor: contentEditor, prisma })).find(
          ({ id }) => id === asset.id,
        ),
      ).toMatchObject({
        imageAltEn: "Fuel filter product image",
        imageAltZhCn: "燃油滤清器产品图片",
        references: [],
      });

      await deleteAsset({
        actor: contentEditor,
        assetId: asset.id,
        prisma,
        storageDirectory,
      });
      assetId = undefined;

      await expect(
        readFile(path.join(storageDirectory, asset.storageFilename)),
      ).rejects.toMatchObject({ code: "ENOENT" });
      await expect(
        prisma.asset.findUnique({ where: { id: asset.id } }),
      ).resolves.toBeNull();
    } finally {
      if (assetId) {
        await prisma.asset.deleteMany({ where: { id: assetId } });
      }
      await rm(storageDirectory, { force: true, recursive: true });
    }
  });

  it("拒绝只有 PDF 标头但无法解析为页面文档的上传", async () => {
    const storageDirectory = await mkdtemp(
      path.join(os.tmpdir(), "torquelis-invalid-document-"),
    );
    const originalFilename = `invalid-${randomUUID()}.pdf`;

    try {
      await expect(
        uploadAsset({
          actor: contentEditor,
          file: {
            bytes: new TextEncoder().encode("%PDF-1.7\nnot a document"),
            declaredMimeType: "application/pdf",
            originalFilename,
          },
          kind: "document",
          prisma,
          storageDirectory,
        }),
      ).rejects.toMatchObject({
        code: "UPLOAD_INVALID",
        validationCode: "DOCUMENT_INVALID",
      });
      await expect(
        prisma.asset.findFirst({ where: { originalFilename } }),
      ).resolves.toBeNull();
    } finally {
      await prisma.asset.deleteMany({ where: { originalFilename } });
      await rm(storageDirectory, { force: true, recursive: true });
    }
  });

  it("替换资料创建新素材并只更新草稿，发布后旧版本引用仍受保护", async () => {
    const storageDirectory = await mkdtemp(
      path.join(os.tmpdir(), "torquelis-documents-"),
    );
    const fixture = await createPublishedFixture();
    const assetIds: string[] = [];
    const firstBytes = await createReplacementPdf("FIRST REPLACEMENT");
    const secondBytes = await createReplacementPdf("SECOND REPLACEMENT");

    try {
      const generatedBeforeReplacement =
        await generatePublishedProductSpecificationPdf({
          locale: "en",
          partNumber: fixture.partNumber,
          prisma,
          slug: fixture.slugEn,
          storageDirectory,
        });
      expect(generatedBeforeReplacement?.bytes).not.toEqual(firstBytes);

      const first = await replaceProductDraftDocument({
        actor: contentEditor,
        expectedDraftVersion: 1,
        file: {
          bytes: firstBytes,
          declaredMimeType: "application/pdf",
          originalFilename: "replacement.pdf",
        },
        partNumber: fixture.partNumber,
        prisma,
        storageDirectory,
      });
      assetIds.push(first.asset.id);

      expect(first.draftVersion).toBe(2);
      expect(first.asset.id).not.toBe(fixture.publication.publicationId);
      const firstDraftDownload = await generateProductDraftSpecificationPdf({
        actor: contentEditor,
        locale: "en",
        partNumber: fixture.partNumber,
        prisma,
        storageDirectory,
      });
      expect(firstDraftDownload.bytes).not.toEqual(firstBytes);
      await expect(
        PDFDocument.load(firstDraftDownload.bytes),
      ).resolves.toBeDefined();
      await expect(
        generatePublishedProductSpecificationPdf({
          locale: "en",
          partNumber: fixture.partNumber,
          prisma,
          slug: fixture.slugEn,
          storageDirectory,
        }),
      ).resolves.not.toMatchObject({ bytes: firstBytes });

      const published = await publishProductDraft({
        actor: contentEditor,
        expectedDraftVersion: 2,
        partNumber: fixture.partNumber,
        prisma,
      });
      await expect(
        generatePublishedProductSpecificationPdf({
          locale: "en",
          partNumber: fixture.partNumber,
          prisma,
          slug: fixture.slugEn,
          storageDirectory,
        }),
      ).resolves.toMatchObject({ bytes: firstDraftDownload.bytes });

      await expect(
        deleteAsset({
          actor: contentEditor,
          assetId: first.asset.id,
          prisma,
          storageDirectory,
        }),
      ).rejects.toEqual(
        expect.objectContaining<Partial<AssetManagementError>>({
          code: "PUBLISHED_ASSET_REFERENCED",
          references: [
            expect.objectContaining({
              current: true,
              partNumber: fixture.partNumber,
              publicationId: published.publicationId,
              usage: "document",
              version: 2,
            }),
          ],
        }),
      );

      const second = await replaceProductDraftDocument({
        actor: contentEditor,
        expectedDraftVersion: 2,
        file: {
          bytes: secondBytes,
          declaredMimeType: "application/pdf",
          originalFilename: "../../replacement.pdf",
        },
        partNumber: fixture.partNumber,
        prisma,
        storageDirectory,
      });
      assetIds.push(second.asset.id);

      expect(second.asset.id).not.toBe(first.asset.id);
      expect(second.asset.storageFilename).not.toBe(
        first.asset.storageFilename,
      );
      expect(
        await readFile(
          path.join(storageDirectory, first.asset.storageFilename),
        ),
      ).toEqual(Buffer.from(firstBytes));
      const secondDraftDownload = await generateProductDraftSpecificationPdf({
        actor: contentEditor,
        locale: "en",
        partNumber: fixture.partNumber,
        prisma,
        storageDirectory,
      });
      expect(secondDraftDownload.bytes).not.toEqual(secondBytes);
      expect(secondDraftDownload.bytes).not.toEqual(firstDraftDownload.bytes);
      await expect(
        generatePublishedProductSpecificationPdf({
          locale: "en",
          partNumber: fixture.partNumber,
          prisma,
          slug: fixture.slugEn,
          storageDirectory,
        }),
      ).resolves.toMatchObject({ bytes: firstDraftDownload.bytes });
    } finally {
      await fixture.cleanup(assetIds);
      await rm(storageDirectory, { force: true, recursive: true });
    }
  });

  it("上传图片的双语替代文本随素材关联进入草稿，重新发布后公开版本才使用新图片", async () => {
    const storageDirectory = await mkdtemp(
      path.join(os.tmpdir(), "torquelis-images-"),
    );
    const fixture = await createPublishedFixture();
    const assetIds: string[] = [];

    try {
      const originalPublic = await getPublishedProduct({
        locale: "en",
        partNumber: fixture.partNumber,
        prisma,
      });
      const image = await uploadAsset({
        actor: contentEditor,
        file: {
          bytes: pngBytes,
          declaredMimeType: "image/png",
          originalFilename: "replacement.png",
        },
        imageAltEn: "Replacement filter from managed asset",
        imageAltZhCn: "素材管理中的替换滤清器",
        kind: "image",
        prisma,
        storageDirectory,
      });
      assetIds.push(image.id);
      const draft = await getProductDraft({
        actor: contentEditor,
        partNumber: fixture.partNumber,
        prisma,
      });
      const saved = await saveProductDraft({
        actor: contentEditor,
        expectedDraftVersion: draft.version,
        input: {
          categoryId: draft.categoryId,
          descriptionEn: draft.descriptionEn,
          descriptionZhCn: draft.descriptionZhCn,
          fitmentSummaryEn: draft.fitmentSummaryEn,
          fitmentSummaryZhCn: draft.fitmentSummaryZhCn,
          imageAltEn: "ignored old English alt",
          imageAltZhCn: "忽略的旧中文替代文本",
          imageAssetId: image.id,
          imagePath: draft.imagePath,
          nameEn: draft.nameEn,
          nameZhCn: draft.nameZhCn,
          references: draft.references.map(({ brand, referenceNumber }) => ({
            brand,
            referenceNumber,
          })),
          replacementPartNumber: null,
          seoDescriptionEn: draft.seoDescriptionEn,
          seoDescriptionZhCn: draft.seoDescriptionZhCn,
          seoTitleEn: draft.seoTitleEn,
          seoTitleZhCn: draft.seoTitleZhCn,
          slugEn: draft.slugEn,
          slugZhCn: draft.slugZhCn,
          specifications: draft.specificationValues.map((value) => ({
            attributeCode: value.attributeCode,
            unit: value.baseUnit ?? undefined,
            value:
              value.dataType === "decimal"
                ? value.decimalValue?.toNumber()
                : value.dataType === "boolean"
                  ? value.booleanValue
                  : value.dataType === "enumeration"
                    ? value.enumerationValue
                    : value.textValue,
          })),
          status: "published",
          summaryEn: draft.summaryEn,
          summaryZhCn: draft.summaryZhCn,
        },
        partNumber: fixture.partNumber,
        prisma,
      });
      const updatedDraft = await getProductDraft({
        actor: contentEditor,
        partNumber: fixture.partNumber,
        prisma,
      });

      expect(updatedDraft).toMatchObject({
        imageAltEn: "Replacement filter from managed asset",
        imageAltZhCn: "素材管理中的替换滤清器",
        imageAssetId: image.id,
        imagePath: image.publicPath,
        version: saved.version,
      });
      await expect(
        getPublishedProduct({
          locale: "en",
          partNumber: fixture.partNumber,
          prisma,
        }),
      ).resolves.toMatchObject({ imagePath: originalPublic?.imagePath });

      await publishProductDraft({
        actor: contentEditor,
        expectedDraftVersion: saved.version,
        partNumber: fixture.partNumber,
        prisma,
      });
      await expect(
        getPublishedProduct({
          locale: "en",
          partNumber: fixture.partNumber,
          prisma,
        }),
      ).resolves.toMatchObject({
        imageAlt: "Replacement filter from managed asset",
        imagePath: image.publicPath,
      });
      await expect(
        deleteAsset({
          actor: contentEditor,
          assetId: image.id,
          prisma,
          storageDirectory,
        }),
      ).rejects.toMatchObject({
        code: "PUBLISHED_ASSET_REFERENCED",
        references: expect.arrayContaining([
          expect.objectContaining({
            partNumber: fixture.partNumber,
            usage: "image",
            version: 2,
          }),
        ]),
      });
    } finally {
      await fixture.cleanup(assetIds);
      await rm(storageDirectory, { force: true, recursive: true });
    }
  });
});

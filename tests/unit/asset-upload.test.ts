import { describe, expect, it } from "vitest";

import {
  AssetUploadValidationError,
  DOCUMENT_MAX_BYTES,
  IMAGE_MAX_BYTES,
  validateAssetUpload,
} from "@/src/modules/content-publishing/public/asset-upload";

const signatures = {
  jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]),
  pdf: new TextEncoder().encode("%PDF-1.7\n"),
  png: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: new TextEncoder().encode("RIFF\u0004\u0000\u0000\u0000WEBP"),
};

describe("素材上传校验", () => {
  it.each([
    ["product.jpg", "image/jpeg", signatures.jpeg, ".jpg"],
    ["product.jpeg", "image/jpeg", signatures.jpeg, ".jpeg"],
    ["product.png", "image/png", signatures.png, ".png"],
    ["product.webp", "image/webp", signatures.webp, ".webp"],
  ] as const)(
    "接受签名、声明 MIME 与扩展名一致的图片 %s",
    (originalFilename, declaredMimeType, bytes, extension) => {
      expect(
        validateAssetUpload({
          bytes,
          declaredMimeType,
          imageAltEn: "Fuel filter product image",
          imageAltZhCn: "燃油滤清器产品图片",
          kind: "image",
          originalFilename,
        }),
      ).toMatchObject({
        extension,
        imageAltEn: "Fuel filter product image",
        imageAltZhCn: "燃油滤清器产品图片",
        mimeType: declaredMimeType,
      });
    },
  );

  it("接受签名、声明 MIME 与扩展名一致的 PDF 资料", () => {
    expect(
      validateAssetUpload({
        bytes: signatures.pdf,
        declaredMimeType: "application/pdf",
        kind: "document",
        originalFilename: "specification.pdf",
      }),
    ).toMatchObject({ extension: ".pdf", mimeType: "application/pdf" });
  });

  it.each([
    {
      code: "EXTENSION_MISMATCH",
      input: {
        bytes: signatures.pdf,
        declaredMimeType: "application/pdf",
        kind: "document" as const,
        originalFilename: "specification.jpg",
      },
    },
    {
      code: "SIGNATURE_MISMATCH",
      input: {
        bytes: new TextEncoder().encode("not a PDF"),
        declaredMimeType: "application/pdf",
        kind: "document" as const,
        originalFilename: "specification.pdf",
      },
    },
    {
      code: "MIME_MISMATCH",
      input: {
        bytes: signatures.png,
        declaredMimeType: "image/jpeg",
        imageAltEn: "Product image",
        imageAltZhCn: "产品图片",
        kind: "image" as const,
        originalFilename: "product.jpg",
      },
    },
    {
      code: "UNSUPPORTED_MEDIA_TYPE",
      input: {
        bytes: signatures.pdf,
        declaredMimeType: "application/pdf",
        imageAltEn: "Product image",
        imageAltZhCn: "产品图片",
        kind: "image" as const,
        originalFilename: "product.pdf",
      },
    },
  ] as const)("拒绝伪装或不一致文件：$code", ({ code, input }) => {
    expect(() => validateAssetUpload(input)).toThrow(
      expect.objectContaining<Partial<AssetUploadValidationError>>({ code }),
    );
  });

  it.each([
    ["image", IMAGE_MAX_BYTES + 1, "image/png", "too-large.png"],
    ["document", DOCUMENT_MAX_BYTES + 1, "application/pdf", "too-large.pdf"],
  ] as const)("拒绝超过 %s 体积上限的文件", (kind, size, mime, name) => {
    expect(() =>
      validateAssetUpload({
        bytes: new Uint8Array(size),
        declaredMimeType: mime,
        imageAltEn: "Product image",
        imageAltZhCn: "产品图片",
        kind,
        originalFilename: name,
      }),
    ).toThrow(expect.objectContaining({ code: "FILE_TOO_LARGE" }));
  });

  it.each([
    ["", "产品图片"],
    ["Product image", ""],
    ["   ", "   "],
  ])("图片缺少任一语言替代文本时拒绝上传", (imageAltEn, imageAltZhCn) => {
    expect(() =>
      validateAssetUpload({
        bytes: signatures.png,
        declaredMimeType: "image/png",
        imageAltEn,
        imageAltZhCn,
        kind: "image",
        originalFilename: "product.png",
      }),
    ).toThrow(expect.objectContaining({ code: "IMAGE_ALT_REQUIRED" }));
  });

  it("只保留路径型原文件名的基础名称用于显示", () => {
    expect(
      validateAssetUpload({
        bytes: signatures.pdf,
        declaredMimeType: "application/pdf",
        kind: "document",
        originalFilename: "../../private\\nested/specification.pdf",
      }).displayFilename,
    ).toBe("specification.pdf");
  });
});

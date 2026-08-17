import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { GET } from "@/app/[locale]/products/[partNumber]/[slug]/specification.pdf/route";
import {
  renderProductSpecificationPdf,
  watermarkUploadedProductSpecificationPdf,
} from "@/src/infrastructure/documents/product-specification-pdf";
import { listPublishedProducts } from "@/src/application/public-catalog";

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const loadingTask = getDocument({
    data: bytes,
    disableFontFace: true,
    useSystemFonts: false,
  });
  const document = await loadingTask.promise;

  try {
    const pages = await Promise.all(
      Array.from({ length: document.numPages }, async (_, index) => {
        const page = await document.getPage(index + 1);
        const content = await page.getTextContent();

        return content.items
          .flatMap((item) => ("str" in item ? [item.str] : []))
          .join(" ");
      }),
    );

    return pages
      .join(" ")
      .replaceAll(/\s+/g, " ")
      .replaceAll(/(?<=[\p{Script=Han}；。]) (?=[\p{Script=Han}；。])/gu, "")
      .trim();
  } finally {
    await loadingTask.destroy();
  }
}

async function downloadSpecificationPdf({
  locale,
  partNumber,
  slug,
}: {
  locale: string;
  partNumber: string;
  slug: string;
}): Promise<Response> {
  return GET(
    new Request(
      `http://localhost/${locale}/products/${partNumber}/${slug}/specification.pdf`,
    ),
    { params: Promise.resolve({ locale, partNumber, slug }) },
  );
}

describe("带演示水印的双语规格 PDF", () => {
  it.each([
    ["en", "FICTIONAL DEMO", "not for selection or purchasing"],
    ["zh-cn", "虚构演示", "不可用于选型或采购"],
  ] as const)(
    "为上传的 %s 替换资料持续叠加对应语言演示声明",
    async (locale, watermark, disclaimer) => {
      const source = await PDFDocument.create();
      const font = await source.embedFont(StandardFonts.Helvetica);
      source.addPage().drawText("CUSTOM PRODUCT DOCUMENT", { font });

      const bytes = await watermarkUploadedProductSpecificationPdf({
        bytes: await source.save(),
        locale,
      });
      const text = await extractPdfText(bytes);

      expect(text).toContain("CUSTOM PRODUCT DOCUMENT");
      expect(text).toContain(watermark);
      expect(text).toContain(disclaimer);
    },
  );

  it("英文下载响应包含当前公开产品的规格、参考号、适配摘要和演示声明", async () => {
    const response = await downloadSpecificationPdf({
      locale: "en",
      partNumber: "TQ-FL-4827",
      slug: "high-efficiency-fuel-filter",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="TQ-FL-4827-specification-en.pdf"',
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");

    const text = await extractPdfText(
      new Uint8Array(await response.arrayBuffer()),
    );

    expect(text).toContain("English specification sheet");
    expect(text).toContain("TQ-FL-4827");
    expect(text).toContain("High-Efficiency Fuel Filter");
    expect(text).toContain("Outer diameter");
    expect(text).toContain("96 mm");
    expect(text).toContain("Novera");
    expect(text).toContain("NFX-9081");
    expect(text).toContain("Northline");
    expect(text).toContain("HX9");
    expect(text).toContain("2019–2024");
    expect(text).toContain("N13-420");
    expect(text).toContain("FICTIONAL DEMO");
    expect(text).toContain(
      "Demo performance data — not certification or testing claims; not for selection or purchasing.",
    );
  });

  it("简体中文下载响应只使用当前语言的名称、字段标签和演示声明", async () => {
    const response = await downloadSpecificationPdf({
      locale: "zh-cn",
      partNumber: "TQ-FL-4827",
      slug: "高效燃油滤清器",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="TQ-FL-4827-specification-zh-cn.pdf"',
    );

    const text = await extractPdfText(
      new Uint8Array(await response.arrayBuffer()),
    );

    expect(text).toContain("简体中文规格表");
    expect(text).toContain("TQ-FL-4827");
    expect(text).toContain("高效燃油滤清器");
    expect(text).toContain("外径");
    expect(text).toContain("96 mm");
    expect(text).toContain("参考号");
    expect(text).toContain("Novera");
    expect(text).toContain("NFX-9081");
    expect(text).toContain("适配摘要");
    expect(text).toContain("Northline");
    expect(text).toContain("HX9");
    expect(text).toContain("2019–2024");
    expect(text).toContain("N13-420");
    expect(text).toContain("虚构演示");
    expect(text).toContain(
      "演示性能数据 — 不构成认证或测试声明；不可用于选型或采购。",
    );
    expect(text).not.toContain("High-Efficiency Fuel Filter");
  });

  it("同一公开版本可重复生成字节稳定且使用规范化安全文件名的资料", async () => {
    const [first, second] = await Promise.all([
      downloadSpecificationPdf({
        locale: "en",
        partNumber: "tq fl 4827",
        slug: "high-efficiency-fuel-filter",
      }),
      downloadSpecificationPdf({
        locale: "en",
        partNumber: "TQ-FL-4827",
        slug: "high-efficiency-fuel-filter",
      }),
    ]);

    expect(first.status).toBe(200);
    expect(first.headers.get("content-disposition")).toBe(
      'attachment; filename="TQ-FL-4827-specification-en.pdf"',
    );
    expect(first.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await first.arrayBuffer())).toEqual(
      Buffer.from(await second.arrayBuffer()),
    );
  });

  it("草稿、错误语言和不属于当前语言的名称不能公开下载", async () => {
    const [draft, unsupportedLocale, wrongLocalizedSlug] = await Promise.all([
      downloadSpecificationPdf({
        locale: "en",
        partNumber: "TQ-DF-9000",
        slug: "draft-filter",
      }),
      downloadSpecificationPdf({
        locale: "fr",
        partNumber: "TQ-FL-4827",
        slug: "high-efficiency-fuel-filter",
      }),
      downloadSpecificationPdf({
        locale: "zh-cn",
        partNumber: "TQ-FL-4827",
        slug: "high-efficiency-fuel-filter",
      }),
    ]);

    expect(draft.status).toBe(404);
    expect(unsupportedLocale.status).toBe(404);
    expect(wrongLocalizedSlug.status).toBe(404);
  });

  it("目录中每个已发布标准替换件都可生成英文和简体中文两份资料", async () => {
    const localizedProducts = await Promise.all(
      (["en", "zh-cn"] as const).map(async (locale) => ({
        locale,
        products: await listPublishedProducts({ locale }),
      })),
    );

    const downloads = await Promise.all(
      localizedProducts.flatMap(({ locale, products }) =>
        products.map(async (product) => ({
          expectedFilename: `${product.partNumber}-specification-${locale}.pdf`,
          response: await downloadSpecificationPdf({
            locale,
            partNumber: product.partNumber,
            slug: product.slug,
          }),
        })),
      ),
    );

    expect(downloads).toHaveLength(94);
    for (const { expectedFilename, response } of downloads) {
      expect(response.status).toBe(200);
      expect(response.headers.get("content-disposition")).toBe(
        `attachment; filename="${expectedFilename}"`,
      );
      expect(new Uint8Array(await response.arrayBuffer()).slice(0, 5)).toEqual(
        new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
      );
    }
  }, 20_000);

  it("新发布内容使用现有演示资料之外的简体中文字形时仍可正确生成", async () => {
    const bytes = await renderProductSpecificationPdf({
      categoryName: "泵类滤清器",
      fitments: [],
      locale: "zh-cn",
      name: "新型泵用滤芯",
      partNumber: "TQ-NEW-0001",
      references: [],
      specifications: [],
    });

    const text = await extractPdfText(bytes);

    expect(text).toContain("新型泵用滤芯");
    expect(text).toContain("泵类滤清器");
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import notoSansScUnicodeRanges from "@fontsource/noto-sans-sc/unicode.json";
import {
  degrees,
  PDFDocument,
  type PDFFont,
  type PDFPage,
  type PDFPageDrawTextOptions,
  rgb,
} from "pdf-lib";

import type { ProductSpecificationDisplay } from "@/src/modules/catalog/public/specifications";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

export type ProductSpecificationPdfInput = {
  categoryName: string;
  fitments: Array<{
    engine: string;
    make: string;
    model: string;
    yearFrom: number;
    yearTo: number;
  }>;
  locale: PublicLocale;
  name: string;
  partNumber: string;
  references: Array<{ brand: string; referenceNumber: string }>;
  specifications: ProductSpecificationDisplay[];
};

const A4_PAGE_SIZE: [number, number] = [595.28, 841.89];
const DOCUMENT_DATE = new Date("2000-01-01T00:00:00.000Z");
const PAGE_MARGIN = 48;
const FOOTER_HEIGHT = 74;
const navy = rgb(16 / 255, 40 / 255, 61 / 255);
const graphite = rgb(91 / 255, 100 / 255, 106 / 255);
const line = rgb(216 / 255, 213 / 255, 205 / 255);
const orange = rgb(229 / 255, 106 / 255, 46 / 255);
const LATIN_FONT_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "noto-sans-sc",
  "files",
  "noto-sans-sc-latin-400-normal.woff",
);
const CJK_FONT_DIRECTORY = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "noto-sans-sc",
  "files",
);

type DocumentFonts = {
  cjkByCharacter: ReadonlyMap<string, PDFFont>;
  latin: PDFFont;
};

type CjkFontDefinition = {
  ranges: Array<{ end: number; start: number }>;
  segment: string;
};

const documentCopy = {
  en: {
    brand: "Torquelis Filters",
    fitments: "Application summary",
    footer:
      "Demo performance data — not certification or testing claims; not for selection or purchasing.",
    references: "Cross-references",
    specification: "English specification sheet",
    specifications: "Key specifications",
    watermark: "FICTIONAL DEMO",
  },
  "zh-cn": {
    brand: "Torquelis Filters / 拓擎利滤清",
    fitments: "适配摘要",
    footer: "演示性能数据 — 不构成认证或测试声明；不可用于选型或采购。",
    references: "参考号",
    specification: "简体中文规格表",
    specifications: "关键规格",
    watermark: "虚构演示",
  },
} as const;

const cjkFontBytesPromises = new Map<string, Promise<Uint8Array>>();
let latinFontBytesPromise: Promise<Uint8Array> | undefined;

function parseUnicodeRange(value: string): { end: number; start: number } {
  const match = /^U\+([0-9a-f]+)(?:-([0-9a-f]+))?$/i.exec(value);

  if (!match) {
    throw new Error(`Unsupported Noto Sans SC Unicode range: ${value}`);
  }

  const start = Number.parseInt(match[1], 16);

  return {
    end: match[2] ? Number.parseInt(match[2], 16) : start,
    start,
  };
}

const CJK_FONT_DEFINITIONS: CjkFontDefinition[] = Object.entries(
  notoSansScUnicodeRanges,
).flatMap(([key, value]) => {
  const segmentMatch = /^\[(\d+)\]$/.exec(key);

  return segmentMatch
    ? [
        {
          ranges: value.split(",").map(parseUnicodeRange),
          segment: segmentMatch[1],
        },
      ]
    : [];
});

function loadLatinFont(): Promise<Uint8Array> {
  latinFontBytesPromise ??= readFile(LATIN_FONT_PATH).then(
    (bytes) => new Uint8Array(bytes),
  );

  return latinFontBytesPromise;
}

function loadCjkFontSegment(segment: string): Promise<Uint8Array> {
  const existing = cjkFontBytesPromises.get(segment);

  if (existing) {
    return existing;
  }

  const bytesPromise = readFile(
    path.join(CJK_FONT_DIRECTORY, `noto-sans-sc-${segment}-400-normal.woff`),
  ).then((bytes) => new Uint8Array(bytes));
  cjkFontBytesPromises.set(segment, bytesPromise);

  return bytesPromise;
}

function usesCjkFont(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;

  return (
    (codePoint >= 0x2e80 && codePoint <= 0x9fff) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xff00 && codePoint <= 0xffef)
  );
}

function drawDocumentText(
  page: PDFPage,
  text: string,
  fonts: DocumentFonts,
  options: PDFPageDrawTextOptions,
): void {
  const runs: Array<{ font: PDFFont; text: string }> = [];

  for (const character of text) {
    const font = usesCjkFont(character)
      ? fonts.cjkByCharacter.get(character)
      : fonts.latin;

    if (!font) {
      throw new Error(
        `Noto Sans SC does not contain U+${character.codePointAt(0)?.toString(16).toUpperCase()} (${character}).`,
      );
    }

    const current = runs.at(-1);

    if (current?.font === font) {
      current.text += character;
    } else {
      runs.push({ font, text: character });
    }
  }

  let x = options.x ?? 0;
  const size = options.size ?? 12;

  for (const run of runs) {
    page.drawText(run.text, { ...options, font: run.font, x });
    x += run.font.widthOfTextAtSize(run.text, size);
  }
}

function drawWatermarkAndFooter({
  fonts,
  locale,
  page,
}: {
  fonts: DocumentFonts;
  locale: PublicLocale;
  page: PDFPage;
}): void {
  const copy = documentCopy[locale];
  const { height, width } = page.getSize();

  drawDocumentText(page, copy.watermark, fonts, {
    color: orange,
    opacity: 0.075,
    rotate: degrees(34),
    size: locale === "en" ? 55 : 64,
    x: locale === "en" ? 86 : 158,
    y: height / 2 - 45,
  });
  page.drawLine({
    color: orange,
    end: { x: width - PAGE_MARGIN, y: FOOTER_HEIGHT },
    start: { x: PAGE_MARGIN, y: FOOTER_HEIGHT },
    thickness: 1.5,
  });
  drawDocumentText(page, copy.footer, fonts, {
    color: graphite,
    size: 9,
    x: PAGE_MARGIN,
    y: 48,
  });
  drawDocumentText(page, copy.brand, fonts, {
    color: navy,
    size: 8,
    x: PAGE_MARGIN,
    y: 32,
  });
}

function formatSpecificationValue(
  specification: ProductSpecificationDisplay,
): string {
  const value = [specification.value, specification.unit]
    .filter(Boolean)
    .join(" ");

  return value.replaceAll("μ", "µ");
}

function collectDocumentText(input: ProductSpecificationPdfInput): string[] {
  const copy = documentCopy[input.locale];

  return [
    ...Object.values(copy),
    "TORQUELIS FILTERS",
    input.partNumber,
    input.name,
    input.categoryName,
    ...input.specifications.flatMap((specification) => [
      specification.label,
      formatSpecificationValue(specification),
    ]),
    ...input.references.flatMap((reference) => [
      reference.brand,
      reference.referenceNumber,
    ]),
    ...input.fitments.flatMap((fitment) => [
      fitment.make,
      fitment.model,
      fitment.engine,
    ]),
  ];
}

function findCjkFontSegment(character: string): string {
  const codePoint = character.codePointAt(0) ?? 0;
  const definition = CJK_FONT_DEFINITIONS.find(({ ranges }) =>
    ranges.some(({ end, start }) => codePoint >= start && codePoint <= end),
  );

  if (!definition) {
    throw new Error(
      `Noto Sans SC has no configured segment for U+${codePoint.toString(16).toUpperCase()} (${character}).`,
    );
  }

  return definition.segment;
}

async function embedDocumentFonts(
  pdf: PDFDocument,
  input: ProductSpecificationPdfInput,
): Promise<DocumentFonts> {
  return embedFontsForText(pdf, collectDocumentText(input));
}

async function embedFontsForText(
  pdf: PDFDocument,
  text: readonly string[],
): Promise<DocumentFonts> {
  const latin = await pdf.embedFont(await loadLatinFont(), { subset: true });
  const cjkCharacters = [
    ...new Set(text.flatMap((text) => Array.from(text)).filter(usesCjkFont)),
  ];
  const segmentByCharacter = new Map(
    cjkCharacters.map((character) => [
      character,
      findCjkFontSegment(character),
    ]),
  );
  const segments = [...new Set(segmentByCharacter.values())].sort(
    (left, right) => Number(left) - Number(right),
  );
  const fontBySegment = new Map<string, PDFFont>();

  for (const segment of segments) {
    fontBySegment.set(
      segment,
      await pdf.embedFont(await loadCjkFontSegment(segment), { subset: true }),
    );
  }

  return {
    cjkByCharacter: new Map(
      [...segmentByCharacter].map(([character, segment]) => [
        character,
        fontBySegment.get(segment)!,
      ]),
    ),
    latin,
  };
}

export async function watermarkUploadedProductSpecificationPdf({
  bytes,
  locale,
}: {
  bytes: Uint8Array;
  locale: PublicLocale;
}): Promise<Uint8Array> {
  const copy = documentCopy[locale];
  const pdf = await PDFDocument.load(bytes);
  pdf.registerFontkit(fontkit);
  const pages = pdf.getPages();
  if (pages.length === 0) {
    throw new Error("Uploaded product document has no pages.");
  }
  const fonts = await embedFontsForText(pdf, Object.values(copy));

  pdf.setAuthor("Torquelis Filters / 拓擎利滤清");
  pdf.setCreator("Torquelis local demo");
  pdf.setKeywords([locale, "fictional demo", "not for purchasing"]);
  pdf.setModificationDate(DOCUMENT_DATE);
  pdf.setProducer("Torquelis local demo");
  pdf.setSubject(copy.footer);

  for (const page of pages) {
    drawWatermarkAndFooter({ fonts, locale, page });
  }

  return pdf.save({ useObjectStreams: false });
}

export async function validateUploadedProductSpecificationPdf(
  bytes: Uint8Array,
): Promise<void> {
  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPages().length === 0) {
    throw new Error("Uploaded product document has no pages.");
  }
}

function drawSection({
  fonts,
  heading,
  page,
  rows,
  y,
}: {
  fonts: DocumentFonts;
  heading: string;
  page: PDFPage;
  rows: Array<{ label: string; value: string }>;
  y: number;
}): number {
  drawDocumentText(page, heading.toUpperCase(), fonts, {
    color: orange,
    size: 9,
    x: PAGE_MARGIN,
    y,
  });
  let cursor = y - 18;

  for (const row of rows) {
    page.drawLine({
      color: line,
      end: { x: A4_PAGE_SIZE[0] - PAGE_MARGIN, y: cursor - 6 },
      start: { x: PAGE_MARGIN, y: cursor - 6 },
      thickness: 0.7,
    });
    drawDocumentText(page, row.label, fonts, {
      color: graphite,
      size: 9,
      x: PAGE_MARGIN,
      y: cursor,
    });
    drawDocumentText(page, row.value, fonts, {
      color: navy,
      size: 9,
      x: 282,
      y: cursor,
    });
    cursor -= 22;
  }

  return cursor - 16;
}

export async function renderProductSpecificationPdf(
  input: ProductSpecificationPdfInput,
): Promise<Uint8Array> {
  const copy = documentCopy[input.locale];
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonts = await embedDocumentFonts(pdf, input);
  const page = pdf.addPage(A4_PAGE_SIZE);

  pdf.setAuthor("Torquelis Filters / 拓擎利滤清");
  pdf.setCreationDate(DOCUMENT_DATE);
  pdf.setCreator("Torquelis local demo");
  pdf.setKeywords([
    input.partNumber,
    input.locale,
    "fictional demo",
    "not for purchasing",
  ]);
  pdf.setModificationDate(DOCUMENT_DATE);
  pdf.setProducer("Torquelis local demo");
  pdf.setSubject(copy.footer);
  pdf.setTitle(`${input.partNumber} — ${copy.specification}`);

  drawWatermarkAndFooter({ fonts, locale: input.locale, page });
  drawDocumentText(page, "TORQUELIS FILTERS", fonts, {
    color: navy,
    size: 11,
    x: PAGE_MARGIN,
    y: 790,
  });
  drawDocumentText(page, copy.specification, fonts, {
    color: orange,
    size: 10,
    x: PAGE_MARGIN,
    y: 766,
  });
  drawDocumentText(page, input.partNumber, fonts, {
    color: navy,
    size: 30,
    x: PAGE_MARGIN,
    y: 724,
  });
  drawDocumentText(page, input.name, fonts, {
    color: navy,
    size: 17,
    x: PAGE_MARGIN,
    y: 695,
  });
  drawDocumentText(page, input.categoryName, fonts, {
    color: graphite,
    size: 10,
    x: PAGE_MARGIN,
    y: 676,
  });

  let y = drawSection({
    fonts,
    heading: copy.specifications,
    page,
    rows: input.specifications.map((specification) => ({
      label: specification.label,
      value: formatSpecificationValue(specification),
    })),
    y: 640,
  });
  y = drawSection({
    fonts,
    heading: copy.references,
    page,
    rows: input.references.map((reference) => ({
      label: reference.brand,
      value: reference.referenceNumber,
    })),
    y,
  });
  drawSection({
    fonts,
    heading: copy.fitments,
    page,
    rows: input.fitments.map((fitment) => ({
      label: `${fitment.make} ${fitment.model}`,
      value: `${fitment.yearFrom}–${fitment.yearTo} · ${fitment.engine}`,
    })),
    y,
  });

  return pdf.save({ useObjectStreams: false });
}

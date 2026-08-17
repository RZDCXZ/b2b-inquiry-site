import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import LocaleLayout from "@/app/[locale]/layout";
import { GET as getSitemap } from "@/app/sitemap.xml/route";
import ProductPage, {
  generateMetadata as generateProductMetadata,
} from "@/app/[locale]/products/[partNumber]/[slug]/page";
import ResourceArticlePage, {
  generateMetadata as generateArticleMetadata,
} from "@/app/[locale]/resources/[slug]/page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("explicit public SEO mode", () => {
  it("lists only current public canonical addresses with actual translations", async () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "public");

    const response = await getSitemap();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8",
    );
    expect(xml).toContain(
      "<loc>https://torquelis.example/en/products/TQ-FL-4827/high-efficiency-fuel-filter</loc>",
    );
    expect(xml).toContain(
      "<loc>https://torquelis.example/en/products/TQ-FL-4720/legacy-fuel-filter</loc>",
    );
    expect(xml).not.toContain("draft-fuel-filter");
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/inquiry/success");

    const englishOnlyArticle = xml.match(
      /<url><loc>https:\/\/torquelis\.example\/en\/resources\/avoiding-cross-reference-ambiguity<\/loc>[\s\S]*?<\/url>/u,
    )?.[0];
    expect(englishOnlyArticle).toContain('hreflang="en"');
    expect(englishOnlyArticle).not.toContain('hreflang="zh-CN"');
  });

  it("canonicalizes an old product slug to the one current public address", async () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "public");

    const metadata = await generateProductMetadata({
      params: Promise.resolve({
        locale: "en",
        partNumber: "TQ-FL-4827",
        slug: "old-product-name",
      }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.alternates).toEqual({
      canonical:
        "https://torquelis.example/en/products/TQ-FL-4827/high-efficiency-fuel-filter",
      languages: {
        en: "https://torquelis.example/en/products/TQ-FL-4827/high-efficiency-fuel-filter",
        "zh-CN":
          "https://torquelis.example/zh-cn/products/TQ-FL-4827/%E9%AB%98%E6%95%88%E7%87%83%E6%B2%B9%E6%BB%A4%E6%B8%85%E5%99%A8",
      },
    });
  });

  it("does not invent an alternate for an unpublished article language", async () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "public");

    const metadata = await generateArticleMetadata({
      params: Promise.resolve({
        locale: "en",
        slug: "avoiding-cross-reference-ambiguity",
      }),
    });

    expect(metadata.alternates).toEqual({
      canonical:
        "https://torquelis.example/en/resources/avoiding-cross-reference-ambiguity",
      languages: {
        en: "https://torquelis.example/en/resources/avoiding-cross-reference-ambiguity",
      },
    });
  });

  it("wires visible organization, product, and article content into page JSON-LD", async () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "public");

    const [layout, productPage, articlePage] = await Promise.all([
      LocaleLayout({
        children: createElement("main", null, "Visible page"),
        params: Promise.resolve({ locale: "en" }),
      }),
      ProductPage({
        params: Promise.resolve({
          locale: "en",
          partNumber: "TQ-FL-4827",
          slug: "high-efficiency-fuel-filter",
        }),
        searchParams: Promise.resolve({}),
      }),
      ResourceArticlePage({
        params: Promise.resolve({
          locale: "en",
          slug: "avoiding-cross-reference-ambiguity",
        }),
      }),
    ]);

    const organizationMarkup = renderToStaticMarkup(layout);
    const productMarkup = renderToStaticMarkup(productPage);
    const articleMarkup = renderToStaticMarkup(articlePage);
    expect(organizationMarkup).toContain('"@type":"Organization"');
    expect(organizationMarkup).toContain('"name":"Torquelis Filters"');
    expect(productMarkup).toContain('"@type":"Product"');
    expect(productMarkup).toContain('"sku":"TQ-FL-4827"');
    expect(articleMarkup).toContain('"@type":"Article"');
    expect(articleMarkup).toContain(
      '"headline":"Avoiding cross-reference ambiguity"',
    );
  });
});

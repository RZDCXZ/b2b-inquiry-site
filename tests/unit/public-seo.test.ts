import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bilingualPublicPaths,
  createArticleStructuredData,
  createLocalizedPageMetadata,
  createOrganizationStructuredData,
  createProductStructuredData,
} from "@/src/application/public-seo";
import { PublicStructuredData } from "@/src/components/public/structured-data";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public page SEO metadata", () => {
  it("keeps an otherwise public page non-indexable by default", () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "private");

    expect(
      createLocalizedPageMetadata({
        description: "Visible page description",
        locale: "en",
        paths: bilingualPublicPaths("/about"),
        title: "Visible page title",
      }),
    ).toEqual({
      description: "Visible page description",
      robots: { follow: false, index: false },
      title: "Visible page title",
    });
  });

  it("uses stable canonical and existing language versions in public mode", () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "public");

    expect(
      createLocalizedPageMetadata({
        description: "Visible article excerpt",
        locale: "en",
        paths: { en: "/en/resources/english-only-article" },
        title: "English-only article",
      }),
    ).toEqual({
      alternates: {
        canonical:
          "https://torquelis.example/en/resources/english-only-article",
        languages: {
          en: "https://torquelis.example/en/resources/english-only-article",
        },
      },
      description: "Visible article excerpt",
      robots: { follow: true, index: true },
      title: "English-only article",
    });
  });

  it("keeps receipt pages non-indexable even in public mode", () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "public");

    expect(
      createLocalizedPageMetadata({
        indexable: false,
        locale: "zh-cn",
        paths: bilingualPublicPaths("/inquiry/success"),
        title: "询盘已提交",
      }),
    ).toEqual({
      robots: { follow: false, index: false },
      title: "询盘已提交",
    });
  });
});

describe("public structured data", () => {
  it("does not emit JSON-LD outside explicit public mode", () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "private");

    expect(
      renderToStaticMarkup(
        createElement(PublicStructuredData, {
          data: { "@context": "https://schema.org", "@type": "Organization" },
        }),
      ),
    ).toBe("");
  });

  it("emits script-safe JSON-LD in explicit public mode", () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "public");

    const markup = renderToStaticMarkup(
      createElement(PublicStructuredData, {
        data: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Visible </script><script>alert(1)</script> heading",
        },
      }),
    );

    expect(markup).toContain('type="application/ld+json"');
    expect(markup).toContain("Visible \\u003c/script>");
    expect(markup).not.toContain("</script><script>");
  });

  it("builds organization, product, and article data from visible content", () => {
    expect(
      createOrganizationStructuredData({
        configuration: {
          addressEn: "88 Demonstration Avenue, Shanghai, China",
          addressZhCn: "中国上海市演示大道 88 号",
          companyNameEn: "Torquelis Filters",
          companyNameZhCn: "拓擎利滤清",
          contactEmail: "inquiries@torquelis.example",
          contactPhone: "+86 21 5555 0188",
          socialLinks: { linkedin: "https://example.com/torquelis" },
        },
        locale: "en",
      }),
    ).toMatchObject({
      "@id": "https://torquelis.example/#organization",
      "@type": "Organization",
      address: "88 Demonstration Avenue, Shanghai, China",
      alternateName: "拓擎利滤清",
      email: "inquiries@torquelis.example",
      name: "Torquelis Filters",
      sameAs: ["https://example.com/torquelis"],
      url: "https://torquelis.example/en",
    });

    expect(
      createProductStructuredData({
        locale: "zh-cn",
        product: {
          category: { name: "燃油滤清器" },
          href: "/zh-cn/products/TQ-FL-4827/high-efficiency-fuel-filter",
          name: "高效燃油滤清器",
          partNumber: "TQ-FL-4827",
          status: "published",
          summary: "公开页面可见的产品摘要。",
        },
      }),
    ).toMatchObject({
      "@type": "Product",
      additionalProperty: {
        "@type": "PropertyValue",
        name: "目录状态",
        value: "已发布",
      },
      category: "燃油滤清器",
      description: "公开页面可见的产品摘要。",
      name: "高效燃油滤清器",
      sku: "TQ-FL-4827",
      url: "https://torquelis.example/zh-cn/products/TQ-FL-4827/high-efficiency-fuel-filter",
    });

    expect(
      createArticleStructuredData({
        article: {
          excerpt: "Visible article excerpt.",
          publishedAt: new Date("2026-08-12T03:04:05.000Z"),
          slug: "checking-fitment-year-ranges",
          title: "Checking fitment year ranges",
        },
        locale: "en",
      }),
    ).toMatchObject({
      "@type": "Article",
      datePublished: "2026-08-12T03:04:05.000Z",
      description: "Visible article excerpt.",
      headline: "Checking fitment year ranges",
      inLanguage: "en",
      url: "https://torquelis.example/en/resources/checking-fitment-year-ranges",
    });
  });
});

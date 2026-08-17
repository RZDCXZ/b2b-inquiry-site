import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";
import { GET as getSitemap } from "@/app/sitemap.xml/route";
import { isPublicSeoMode } from "@/src/modules/site-config/server/seo-mode";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SEO mode", () => {
  it("only enables indexing for the explicit public mode value", () => {
    expect(isPublicSeoMode({})).toBe(false);
    expect(isPublicSeoMode({ TORQUELIS_SEO_MODE: "private" })).toBe(false);
    expect(isPublicSeoMode({ TORQUELIS_SEO_MODE: "true" })).toBe(false);
    expect(isPublicSeoMode({ TORQUELIS_SEO_MODE: "PUBLIC" })).toBe(false);
    expect(isPublicSeoMode({ TORQUELIS_SEO_MODE: "public" })).toBe(true);
  });

  it("blocks all crawling and omits a sitemap by default", () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "private");

    expect(robots()).toEqual({
      rules: { disallow: "/", userAgent: "*" },
    });
  });

  it("only advertises the canonical sitemap in public mode", () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "public");

    expect(robots()).toEqual({
      host: "https://torquelis.example",
      rules: {
        allow: "/",
        disallow: ["/admin/", "/api/"],
        userAgent: "*",
      },
      sitemap: "https://torquelis.example/sitemap.xml",
    });
  });

  it("does not expose a sitemap outside public mode", async () => {
    vi.stubEnv("TORQUELIS_SEO_MODE", "private");

    const response = await getSitemap();

    expect(response.status).toBe(404);
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(await response.text()).toBe("");
  });
});

import type { MetadataRoute } from "next";

import {
  isPublicSeoMode,
  SEO_CANONICAL_ORIGIN,
} from "@/src/modules/site-config/server/seo-mode";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (!isPublicSeoMode()) {
    return { rules: { disallow: "/", userAgent: "*" } };
  }

  return {
    host: SEO_CANONICAL_ORIGIN,
    rules: {
      allow: "/",
      disallow: ["/admin/", "/api/"],
      userAgent: "*",
    },
    sitemap: `${SEO_CANONICAL_ORIGIN}/sitemap.xml`,
  };
}

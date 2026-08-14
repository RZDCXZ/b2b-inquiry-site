import type { MetadataRoute } from "next";

import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";
import { productDetailPath } from "@/src/modules/catalog/public/product-identity";
import { listCurrentProductSitemapContent } from "@/src/modules/content-publishing/server/product-sitemap-query";

const defaultSiteOrigin = "http://localhost:3000";

function siteOrigin(): string {
  try {
    return new URL(process.env.SITE_URL ?? defaultSiteOrigin).origin;
  } catch {
    return defaultSiteOrigin;
  }
}

function absoluteUrl(path: string): string {
  return new URL(path, siteOrigin()).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listCurrentProductSitemapContent(
    getApplicationPrisma(),
  );
  const staticPaths = ["", "/products"];
  const staticEntries: MetadataRoute.Sitemap = staticPaths.flatMap((path) => {
    const englishUrl = absoluteUrl("/en" + path);
    const chineseUrl = absoluteUrl("/zh-cn" + path);
    const alternates = {
      languages: { en: englishUrl, "zh-CN": chineseUrl },
    };

    return [
      { alternates, priority: path ? 0.8 : 1, url: englishUrl },
      { alternates, priority: path ? 0.8 : 1, url: chineseUrl },
    ];
  });
  const productEntries: MetadataRoute.Sitemap = products.flatMap(
    ({ currentPublication, partNumber }) => {
      if (!currentPublication) {
        return [];
      }

      const englishUrl = absoluteUrl(
        productDetailPath("en", {
          partNumber,
          slug: currentPublication.slugEn,
        }),
      );
      const chineseUrl = absoluteUrl(
        productDetailPath("zh-cn", {
          partNumber,
          slug: currentPublication.slugZhCn,
        }),
      );
      const alternates = {
        languages: { en: englishUrl, "zh-CN": chineseUrl },
      };

      return [
        {
          alternates,
          lastModified: currentPublication.publishedAt,
          priority: 0.7,
          url: englishUrl,
        },
        {
          alternates,
          lastModified: currentPublication.publishedAt,
          priority: 0.7,
          url: chineseUrl,
        },
      ];
    },
  );

  return [...staticEntries, ...productEntries];
}

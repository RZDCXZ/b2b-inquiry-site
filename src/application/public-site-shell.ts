import { listPublishedCorePageKeys } from "@/src/application/site-content-management";
import { getPublicSiteConfiguration } from "@/src/application/site-configuration";
import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";
import { CORE_PAGE_DEFINITIONS } from "@/src/modules/content-publishing/public/core-page-contracts";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

export async function getPublicSiteShellData({
  prisma,
}: {
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}) {
  const [configuration, publishedPageKeys] = await Promise.all([
    getPublicSiteConfiguration({ prisma }),
    listPublishedCorePageKeys({ prisma }),
  ]);
  return {
    configuration,
    visibleNavigationAnchors: [
      "products",
      ...publishedPageKeys.flatMap((key) => {
        const anchor = CORE_PAGE_DEFINITIONS[key].navigationAnchor;
        return anchor ? [anchor] : [];
      }),
    ],
  };
}

export type PublicSiteShellData = Awaited<
  ReturnType<typeof getPublicSiteShellData>
>;

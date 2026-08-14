import { listPublishedCorePageKeys } from "@/src/application/site-content-management";
import { getPublicSiteConfiguration } from "@/src/application/site-configuration";
import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";
import type { CorePageKey } from "@/src/modules/content-publishing/public/core-page-contracts";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

const navigationAnchorByPageKey: Partial<Record<CorePageKey, string>> = {
  about: "about",
  contact: "contact",
  manufacturing_quality: "quality",
  private_label: "private-label",
  technical_resources: "resources",
};

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
        const anchor = navigationAnchorByPageKey[key];
        return anchor ? [anchor] : [];
      }),
    ],
  };
}

export type PublicSiteShellData = Awaited<
  ReturnType<typeof getPublicSiteShellData>
>;

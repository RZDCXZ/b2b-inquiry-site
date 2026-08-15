import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";

export type ContentPublishingDashboardCounts = {
  pendingArticleDraftCount: number;
  pendingCorePageDraftCount: number;
  pendingProductDraftCount: number;
};

function countPendingDrafts(
  drafts: Array<{ lastPublishedVersion: number | null; version: number }>,
): number {
  return drafts.filter(
    ({ lastPublishedVersion, version }) => lastPublishedVersion !== version,
  ).length;
}

export async function getContentPublishingDashboardCounts(
  prisma: ApplicationDatabase = getApplicationPrisma(),
): Promise<ContentPublishingDashboardCounts> {
  const [productDrafts, corePageDrafts, articleDrafts] = await Promise.all([
    prisma.productDraft.findMany({
      select: { lastPublishedVersion: true, version: true },
    }),
    prisma.corePageDraft.findMany({
      select: { lastPublishedVersion: true, version: true },
    }),
    prisma.articleDraft.findMany({
      select: { lastPublishedVersion: true, version: true },
    }),
  ]);

  return {
    pendingArticleDraftCount: countPendingDrafts(articleDrafts),
    pendingCorePageDraftCount: countPendingDrafts(corePageDrafts),
    pendingProductDraftCount: countPendingDrafts(productDrafts),
  };
}

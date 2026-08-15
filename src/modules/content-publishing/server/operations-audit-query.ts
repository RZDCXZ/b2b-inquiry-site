import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";

export async function resolveArticleAuditTargetLabels({
  prisma = getApplicationPrisma(),
  targetIds,
}: {
  prisma?: ApplicationDatabase;
  targetIds: readonly string[];
}): Promise<ReadonlyMap<string, string>> {
  const ids = [...new Set(targetIds)];
  if (ids.length === 0) return new Map();
  const articles = await prisma.article.findMany({
    select: { id: true, topicKey: true },
    where: { OR: [{ id: { in: ids } }, { topicKey: { in: ids } }] },
  });
  const labels = new Map<string, string>();
  for (const article of articles) {
    if (ids.includes(article.id)) labels.set(article.id, article.topicKey);
    if (ids.includes(article.topicKey)) {
      labels.set(article.topicKey, article.topicKey);
    }
  }
  return labels;
}

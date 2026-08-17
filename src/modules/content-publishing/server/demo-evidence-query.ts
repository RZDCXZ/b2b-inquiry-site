import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";

export async function readContentDemoEvidence() {
  const prisma = getApplicationPrisma();

  return {
    articles: await prisma.article.count(),
  };
}

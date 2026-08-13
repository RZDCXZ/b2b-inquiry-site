import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  LOCAL_DATABASE_ID,
  LOCAL_ENVIRONMENT_MARKER,
} from "@/src/modules/site-config/public/local-demo-target";

async function writeDemoData(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  await transaction.environmentIdentity.upsert({
    create: {
      databaseId: LOCAL_DATABASE_ID,
      environmentMarker: LOCAL_ENVIRONMENT_MARKER,
      key: "primary",
    },
    update: {
      databaseId: LOCAL_DATABASE_ID,
      environmentMarker: LOCAL_ENVIRONMENT_MARKER,
    },
    where: { key: "primary" },
  });

  await transaction.siteConfiguration.upsert({
    create: {
      companyNameEn: "Torquelis Filters",
      companyNameZhCn: "拓擎利滤清",
      contactEmail: "inquiries@torquelis.example",
      key: "primary",
    },
    update: {
      companyNameEn: "Torquelis Filters",
      companyNameZhCn: "拓擎利滤清",
      contactEmail: "inquiries@torquelis.example",
    },
    where: { key: "primary" },
  });
}

export async function seedDemoData(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction((transaction) => writeDemoData(transaction));
}

export async function replaceDemoData(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.siteConfiguration.deleteMany();
    await writeDemoData(transaction);
  });
}

import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  LOCAL_DATABASE_ID,
  LOCAL_ENVIRONMENT_MARKER,
} from "@/src/modules/site-config/public/local-demo-target";

const demoDatasetTimestamp = new Date("2026-08-17T04:00:00.000Z");

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
      addressEn: "Shanghai, China (fictional demo address)",
      addressZhCn: "中国上海（虚构演示地址）",
      companyNameEn: "Torquelis Filters",
      companyNameZhCn: "拓擎利滤清",
      contactEmail: "inquiries@torquelis.example",
      contactPhone: "+86 000 0000 0000",
      createdAt: demoDatasetTimestamp,
      defaultSeoDescriptionEn:
        "Fictional commercial vehicle filtration catalogue and inquiry demo.",
      defaultSeoDescriptionZhCn: "虚构商用车滤清器目录与询盘演示系统。",
      defaultSeoTitleEn: "Torquelis Filters",
      defaultSeoTitleZhCn: "拓擎利滤清",
      key: "primary",
      notificationRecipientRoles: ["administrator"],
      socialLinks: {
        linkedin: "https://www.linkedin.com/company/torquelis-demo",
      },
      updatedAt: demoDatasetTimestamp,
    },
    update: {
      addressEn: "Shanghai, China (fictional demo address)",
      addressZhCn: "中国上海（虚构演示地址）",
      companyNameEn: "Torquelis Filters",
      companyNameZhCn: "拓擎利滤清",
      contactEmail: "inquiries@torquelis.example",
      contactPhone: "+86 000 0000 0000",
      defaultSeoDescriptionEn:
        "Fictional commercial vehicle filtration catalogue and inquiry demo.",
      defaultSeoDescriptionZhCn: "虚构商用车滤清器目录与询盘演示系统。",
      defaultSeoTitleEn: "Torquelis Filters",
      defaultSeoTitleZhCn: "拓擎利滤清",
      lastModifiedByUserId: null,
      notificationRecipientRoles: ["administrator"],
      socialLinks: {
        linkedin: "https://www.linkedin.com/company/torquelis-demo",
      },
      updatedAt: demoDatasetTimestamp,
      version: 1,
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

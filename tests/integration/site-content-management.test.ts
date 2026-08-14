import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  archiveArticle,
  archiveCorePage,
  getArticleDraft,
  getCorePageDraft,
  getPublishedArticle,
  getPublishedCorePage,
  publishArticleDraft,
  publishCorePageDraft,
  restoreArticlePublication,
  saveArticleDraft,
  saveCorePageDraft,
} from "@/src/application/site-content-management";
import { getPublicSiteShellData } from "@/src/application/public-site-shell";
import {
  getEditableSiteConfiguration,
  saveSiteConfiguration,
} from "@/src/application/site-configuration";
import { replaceInquiryAndNotificationData } from "@/src/application/inquiry-demo-reset";
import {
  issueInquiryForm,
  submitInquiry,
} from "@/src/application/public-inquiry";
import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { replaceSiteContent } from "@/src/modules/content-publishing/server/site-content-demo-data";
import { seedDemoData } from "@/src/modules/site-config/server/local-demo-data";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);
const contentEditor: AdminActor = {
  id: "demo-user-content_editor",
  name: "王晴",
  role: "content_editor",
};
const administrator: AdminActor = {
  id: "demo-user-administrator",
  name: "陈屿",
  role: "administrator",
};

describe("核心页面、文章与站点设置", () => {
  beforeAll(async () => {
    await replaceInquiryAndNotificationData(prisma);
    await replaceSiteContent(prisma);
    await seedDemoData(prisma);
  });

  afterAll(async () => {
    await replaceInquiryAndNotificationData(prisma);
    await replaceSiteContent(prisma);
    await seedDemoData(prisma);
    await prisma.$disconnect();
  });

  it("核心页面必须中英文同时通过校验后才形成不可变发布版本", async () => {
    const original = await getCorePageDraft({
      actor: contentEditor,
      key: "about",
      prisma,
    });
    const incomplete = await saveCorePageDraft({
      actor: contentEditor,
      expectedDraftVersion: original.version,
      input: {
        contentEn: original.contentEn,
        contentZhCn: { ...original.contentZhCn, lede: "", title: "" },
      },
      key: "about",
      prisma,
    });

    await expect(
      publishCorePageDraft({
        actor: contentEditor,
        expectedDraftVersion: incomplete.version,
        key: "about",
        prisma,
      }),
    ).rejects.toMatchObject({
      code: "PUBLISH_VALIDATION_FAILED",
      fieldErrors: expect.arrayContaining([
        expect.objectContaining({ field: "zhCn:title" }),
        expect.objectContaining({ field: "zhCn:lede" }),
      ]),
    });

    const ready = await saveCorePageDraft({
      actor: contentEditor,
      expectedDraftVersion: incomplete.version,
      input: {
        contentEn: {
          ...original.contentEn,
          title: "A maintained manufacturing story",
        },
        contentZhCn: original.contentZhCn,
      },
      key: "about",
      prisma,
    });
    const published = await publishCorePageDraft({
      actor: contentEditor,
      expectedDraftVersion: ready.version,
      key: "about",
      prisma,
    });

    await expect(
      getPublishedCorePage({ key: "about", locale: "en", prisma }),
    ).resolves.toMatchObject({
      content: { title: "A maintained manufacturing story" },
      publicationId: published.publicationId,
    });
    await expect(
      prisma.corePagePublication.update({
        data: { contentEn: { changed: true } },
        where: { id: published.publicationId },
      }),
    ).rejects.toThrow(/immutable/u);
  });

  it("文章可只发布英文，恢复只创建草稿，归档后前台隐藏且历史保留", async () => {
    const article = await prisma.article.findUniqueOrThrow({
      where: { topicKey: "avoiding-cross-reference-ambiguity" },
    });
    const english = await getArticleDraft({
      actor: contentEditor,
      articleId: article.id,
      locale: "en",
      prisma,
    });
    const saved = await saveArticleDraft({
      actor: contentEditor,
      articleId: article.id,
      expectedDraftVersion: english.version,
      input: {
        body: "## Cross-reference checks\n\nUse **all matching products** before selecting a replacement.",
        excerpt: english.excerpt,
        seoDescription: english.seoDescription,
        seoTitle: english.seoTitle,
        slug: english.slug,
        title: "Avoiding cross-reference ambiguity",
      },
      locale: "en",
      prisma,
    });
    const firstPublication = await publishArticleDraft({
      actor: contentEditor,
      articleId: article.id,
      expectedDraftVersion: saved.version,
      locale: "en",
      prisma,
    });

    await expect(
      getPublishedArticle({ locale: "en", prisma, slug: english.slug }),
    ).resolves.toMatchObject({
      title: "Avoiding cross-reference ambiguity",
    });
    await expect(
      getPublishedArticle({ locale: "zh-cn", prisma, slug: english.slug }),
    ).resolves.toBeNull();

    const restored = await restoreArticlePublication({
      actor: contentEditor,
      articleId: article.id,
      expectedDraftVersion: saved.version,
      locale: "en",
      prisma,
      publicationId: firstPublication.publicationId,
    });
    expect(restored.restoredFromPublicationId).toBe(
      firstPublication.publicationId,
    );
    await expect(
      getPublishedArticle({ locale: "en", prisma, slug: english.slug }),
    ).resolves.toMatchObject({
      publicationId: firstPublication.publicationId,
    });

    await archiveArticle({
      actor: contentEditor,
      articleId: article.id,
      expectedDraftVersion: restored.version,
      locale: "en",
      prisma,
    });
    await expect(
      getPublishedArticle({ locale: "en", prisma, slug: english.slug }),
    ).resolves.toBeNull();
    await expect(
      prisma.articlePublication.count({
        where: { articleId: article.id, locale: "en" },
      }),
    ).resolves.toBeGreaterThanOrEqual(2);
  });

  it("只有管理员可修改有限站点设置，并拒绝过期版本保存", async () => {
    const settings = await getEditableSiteConfiguration({
      actor: administrator,
      prisma,
    });
    const input = {
      addressEn: settings.addressEn,
      addressZhCn: settings.addressZhCn,
      companyNameEn: settings.companyNameEn,
      companyNameZhCn: settings.companyNameZhCn,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      defaultSeoDescriptionEn: settings.defaultSeoDescriptionEn,
      defaultSeoDescriptionZhCn: settings.defaultSeoDescriptionZhCn,
      defaultSeoTitleEn: settings.defaultSeoTitleEn,
      defaultSeoTitleZhCn: settings.defaultSeoTitleZhCn,
      notificationRecipientRoles: ["administrator", "sales"] as const,
      socialLinks: settings.socialLinks,
    };

    await expect(
      saveSiteConfiguration({
        actor: contentEditor,
        expectedVersion: settings.version,
        input,
        prisma,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const saved = await saveSiteConfiguration({
      actor: administrator,
      expectedVersion: settings.version,
      input: { ...input, contactPhone: "+86 21 5555 0188" },
      prisma,
    });
    expect(saved).toMatchObject({
      contactPhone: "+86 21 5555 0188",
      version: settings.version + 1,
    });

    const issued = await issueInquiryForm({
      locale: "en",
      now: new Date("2026-08-14T23:58:55.000Z"),
      prisma,
    });
    const submission = await submitInquiry({
      clientAddress: "198.51.100.215",
      fingerprintSecret: "ticket-15-integration-secret",
      form: {
        company: "Ticket 15 Test Company",
        contactName: "Editorial Tester",
        countryRegion: "Singapore",
        customPackagingNeeded: false,
        expectedQuantity: "100 pieces",
        honeypot: "",
        message: "Verify configured notification recipient roles.",
        phoneOrWhatsapp: "",
        privacyConsent: true,
        privateLabelNeeded: false,
        targetMarket: "Southeast Asia",
        workEmail: "editorial-test@example.com",
      },
      now: new Date("2026-08-14T23:59:00.000Z"),
      prisma,
      token: issued?.token ?? "",
    });
    await expect(
      prisma.notificationOutboxRecord.findMany({
        orderBy: { recipientRole: "asc" },
        select: { recipientRole: true },
        where: {
          inquiryReferenceNumber: submission.receipt.referenceNumber,
        },
      }),
    ).resolves.toEqual([
      { recipientRole: "administrator" },
      { recipientRole: "sales" },
    ]);
    await expect(
      saveSiteConfiguration({
        actor: administrator,
        expectedVersion: settings.version,
        input,
        prisma,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      conflict: expect.objectContaining({ latestVersion: saved.version }),
    });
  });

  it("归档核心页面会从公共导航中隐藏", async () => {
    const draft = await getCorePageDraft({
      actor: contentEditor,
      key: "manufacturing_quality",
      prisma,
    });
    await expect(
      getPublicSiteShellData({ locale: "en", prisma }),
    ).resolves.toMatchObject({
      visibleNavigationAnchors: expect.arrayContaining(["quality"]),
    });

    await archiveCorePage({
      actor: contentEditor,
      expectedDraftVersion: draft.version,
      key: "manufacturing_quality",
      prisma,
    });
    const archivedShell = await getPublicSiteShellData({
      locale: "en",
      prisma,
    });
    expect(archivedShell.visibleNavigationAnchors).not.toContain("quality");

    await replaceSiteContent(prisma);
  });
});

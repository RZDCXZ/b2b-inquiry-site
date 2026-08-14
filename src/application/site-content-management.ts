import { z } from "zod";

import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  CORE_PAGE_DEFINITIONS,
  CORE_PAGE_KEYS,
  parseCorePageDraftTranslation,
  parseCorePageTranslation,
  type CorePageKey,
  type CorePageTranslation,
  validateCorePageTranslation,
} from "@/src/modules/content-publishing/public/core-page-contracts";
import { validateRestrictedRichText } from "@/src/modules/content-publishing/public/restricted-rich-text";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import {
  hasPermission,
  PERMISSIONS,
} from "@/src/modules/identity-access/public/permissions";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

type ContentDatabase = PrismaClient | Prisma.TransactionClient;

export type SiteContentErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_CONTENT"
  | "NOT_FOUND"
  | "NOTHING_TO_PUBLISH"
  | "PUBLISH_VALIDATION_FAILED";

export type ContentConflict = {
  latestModifiedAt: Date;
  latestModifiedBy: string;
  latestVersion: number;
};

export class SiteContentError extends Error {
  constructor(
    public readonly code: SiteContentErrorCode,
    public readonly fieldErrors: Array<{ field: string; message: string }> = [],
    public readonly conflict?: ContentConflict,
  ) {
    super(code);
    this.name = "SiteContentError";
  }
}

function database(prisma?: ApplicationDatabase): ApplicationDatabase {
  return prisma ?? getApplicationPrisma();
}

function assertContentManager(actor: AdminActor): void {
  if (!hasPermission(actor.role, PERMISSIONS.CONTENT_MANAGE)) {
    throw new SiteContentError("FORBIDDEN");
  }
}

function dbLocale(locale: PublicLocale): "en" | "zh_cn" {
  return locale === "zh-cn" ? "zh_cn" : "en";
}

function publicLocale(locale: "en" | "zh_cn"): PublicLocale {
  return locale === "zh_cn" ? "zh-cn" : "en";
}

function corePageConflict(record: {
  lastModifiedBy: { name: string } | null;
  updatedAt: Date;
  version: number;
}): ContentConflict {
  return {
    latestModifiedAt: record.updatedAt,
    latestModifiedBy: record.lastModifiedBy?.name ?? "系统",
    latestVersion: record.version,
  };
}

function articleConflict(record: {
  lastModifiedBy: { name: string } | null;
  updatedAt: Date;
  version: number;
}): ContentConflict {
  return corePageConflict(record);
}

export type CorePageDraftInput = {
  contentEn: CorePageTranslation;
  contentZhCn: CorePageTranslation;
};

async function findCorePageDraft(prisma: ContentDatabase, key: CorePageKey) {
  return prisma.corePageDraft.findUnique({
    include: {
      lastModifiedBy: { select: { name: true } },
      page: { select: { currentPublicationId: true } },
      restoredFromPublication: { select: { version: true } },
    },
    where: { pageKey: key },
  });
}

function toCorePageDraft(
  key: CorePageKey,
  record: NonNullable<Awaited<ReturnType<typeof findCorePageDraft>>>,
) {
  return {
    contentEn: parseCorePageDraftTranslation(key, record.contentEn),
    contentZhCn: parseCorePageDraftTranslation(key, record.contentZhCn),
    currentPublicationId: record.page.currentPublicationId,
    key,
    label: CORE_PAGE_DEFINITIONS[key].label,
    lastModifiedAt: record.updatedAt,
    lastModifiedBy: record.lastModifiedBy?.name ?? "系统",
    lastPublishedVersion: record.lastPublishedVersion,
    restoredFromPublicationVersion:
      record.restoredFromPublication?.version ?? null,
    status: record.status,
    version: record.version,
  };
}

export async function getCorePageDraft({
  actor,
  key,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  key: CorePageKey;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  const record = await findCorePageDraft(database(providedPrisma), key);
  if (!record) {
    throw new SiteContentError("NOT_FOUND");
  }
  return toCorePageDraft(key, record);
}

export async function listCorePageDrafts({
  actor,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  const records = await database(providedPrisma).corePageDraft.findMany({
    include: {
      lastModifiedBy: { select: { name: true } },
      page: { select: { currentPublicationId: true } },
      restoredFromPublication: { select: { version: true } },
    },
    orderBy: { pageKey: "asc" },
  });
  const byKey = new Map(records.map((record) => [record.pageKey, record]));
  return CORE_PAGE_KEYS.flatMap((key) => {
    const record = byKey.get(key);
    return record ? [toCorePageDraft(key, record)] : [];
  });
}

function parseCoreDraftInput(
  key: CorePageKey,
  input: CorePageDraftInput,
): CorePageDraftInput {
  try {
    return {
      contentEn: parseCorePageDraftTranslation(key, input.contentEn),
      contentZhCn: parseCorePageDraftTranslation(key, input.contentZhCn),
    };
  } catch (error) {
    throw new SiteContentError("INVALID_CONTENT", [
      {
        field: "content",
        message: error instanceof Error ? error.message : "页面草稿格式无效。",
      },
    ]);
  }
}

export async function saveCorePageDraft({
  actor,
  expectedDraftVersion,
  input,
  key,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  expectedDraftVersion: number;
  input: CorePageDraftInput;
  key: CorePageKey;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  const parsed = parseCoreDraftInput(key, input);
  const prisma = database(providedPrisma);

  return prisma.$transaction(async (transaction) => {
    const existing = await findCorePageDraft(transaction, key);
    if (!existing) {
      throw new SiteContentError("NOT_FOUND");
    }
    if (existing.version !== expectedDraftVersion) {
      throw new SiteContentError("CONFLICT", [], corePageConflict(existing));
    }

    const updated = await transaction.corePageDraft.updateMany({
      data: {
        contentEn: parsed.contentEn,
        contentZhCn: parsed.contentZhCn,
        lastModifiedByUserId: actor.id,
        restoredFromPublicationId: null,
        version: { increment: 1 },
      },
      where: { pageKey: key, version: expectedDraftVersion },
    });
    if (updated.count !== 1) {
      const latest = await findCorePageDraft(transaction, key);
      throw new SiteContentError(
        "CONFLICT",
        [],
        latest ? corePageConflict(latest) : undefined,
      );
    }

    await transaction.auditLog.create({
      data: {
        actorRole: actor.role,
        actorUserId: actor.id,
        event: "CORE_PAGE_DRAFT_SAVED",
        outcome: "SUCCESS",
        summary: `${CORE_PAGE_DEFINITIONS[key].label}草稿已保存。`,
        targetId: key,
        targetType: "CORE_PAGE",
      },
    });
    const saved = await findCorePageDraft(transaction, key);
    if (!saved) throw new SiteContentError("NOT_FOUND");
    return toCorePageDraft(key, saved);
  });
}

function corePublicationErrors(key: CorePageKey, input: CorePageDraftInput) {
  const errors: Array<{ field: string; message: string }> = [];
  const en = validateCorePageTranslation(key, input.contentEn);
  const zhCn = validateCorePageTranslation(key, input.contentZhCn);
  if (!en.success) {
    errors.push(
      ...en.issues.map((message) => corePageFieldError("en", message)),
    );
  }
  if (!zhCn.success) {
    errors.push(
      ...zhCn.issues.map((message) => corePageFieldError("zhCn", message)),
    );
  }
  return errors;
}

function corePageFieldError(
  prefix: "en" | "zhCn",
  issue: string,
): { field: string; message: string } {
  const separator = issue.indexOf(": ");
  if (separator < 1) return { field: `${prefix}:eyebrow`, message: issue };
  const path = issue.slice(0, separator);
  const sectionMatch = /^sections\.([^.]+)\.(heading|body)$/u.exec(path);
  const field = sectionMatch
    ? `${prefix}:section:${sectionMatch[1]}:${sectionMatch[2]}`
    : `${prefix}:${path}`;
  return { field, message: issue.slice(separator + 2) };
}

async function nextCorePublicationVersion(
  transaction: Prisma.TransactionClient,
  key: CorePageKey,
) {
  const latest = await transaction.corePagePublication.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
    where: { pageKey: key },
  });
  return (latest?.version ?? 0) + 1;
}

export async function publishCorePageDraft({
  actor,
  expectedDraftVersion,
  key,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  expectedDraftVersion: number;
  key: CorePageKey;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  const prisma = database(providedPrisma);

  return prisma.$transaction(async (transaction) => {
    const draft = await findCorePageDraft(transaction, key);
    if (!draft) throw new SiteContentError("NOT_FOUND");
    if (draft.version !== expectedDraftVersion) {
      throw new SiteContentError("CONFLICT", [], corePageConflict(draft));
    }
    const errors = corePublicationErrors(key, {
      contentEn: parseCorePageDraftTranslation(key, draft.contentEn),
      contentZhCn: parseCorePageDraftTranslation(key, draft.contentZhCn),
    });
    if (errors.length > 0) {
      throw new SiteContentError("PUBLISH_VALIDATION_FAILED", errors);
    }
    if (draft.lastPublishedVersion === draft.version) {
      throw new SiteContentError("NOTHING_TO_PUBLISH");
    }

    const claim = await transaction.corePageDraft.updateMany({
      data: { lastPublishedVersion: draft.version },
      where: {
        pageKey: key,
        version: expectedDraftVersion,
        OR: [
          { lastPublishedVersion: null },
          { lastPublishedVersion: { not: draft.version } },
        ],
      },
    });
    if (claim.count !== 1) {
      const latest = await findCorePageDraft(transaction, key);
      if (latest && latest.version !== expectedDraftVersion) {
        throw new SiteContentError("CONFLICT", [], corePageConflict(latest));
      }
      throw new SiteContentError("NOTHING_TO_PUBLISH");
    }

    const now = new Date();
    const publication = await transaction.corePagePublication.create({
      data: {
        contentEn: draft.contentEn as Prisma.InputJsonValue,
        contentZhCn: draft.contentZhCn as Prisma.InputJsonValue,
        pageKey: key,
        publishedAt: now,
        publishedByUserId: actor.id,
        restoredFromPublicationId: draft.restoredFromPublicationId,
        sourceDraftVersion: draft.version,
        status: draft.status,
        version: await nextCorePublicationVersion(transaction, key),
      },
    });
    await transaction.corePage.update({
      data: { currentPublicationId: publication.id },
      where: { key },
    });
    await transaction.corePagePublication.update({
      data: { sealedAt: now },
      where: { id: publication.id },
    });
    await transaction.auditLog.create({
      data: {
        actorRole: actor.role,
        actorUserId: actor.id,
        event: "CORE_PAGE_PUBLISHED",
        outcome: "SUCCESS",
        summary: `${CORE_PAGE_DEFINITIONS[key].label}形成不可变发布版本 v${publication.version}。`,
        targetId: key,
        targetType: "CORE_PAGE",
      },
    });
    return { publicationId: publication.id, version: publication.version };
  });
}

export async function restoreCorePagePublication({
  actor,
  expectedDraftVersion,
  key,
  prisma: providedPrisma,
  publicationId,
}: {
  actor: AdminActor;
  expectedDraftVersion: number;
  key: CorePageKey;
  prisma?: ApplicationDatabase;
  publicationId: string;
}) {
  assertContentManager(actor);
  const prisma = database(providedPrisma);
  return prisma.$transaction(async (transaction) => {
    const [draft, publication] = await Promise.all([
      findCorePageDraft(transaction, key),
      transaction.corePagePublication.findFirst({
        where: { id: publicationId, pageKey: key },
      }),
    ]);
    if (!draft || !publication) throw new SiteContentError("NOT_FOUND");
    if (draft.version !== expectedDraftVersion) {
      throw new SiteContentError("CONFLICT", [], corePageConflict(draft));
    }
    const updated = await transaction.corePageDraft.updateMany({
      data: {
        contentEn: publication.contentEn as Prisma.InputJsonValue,
        contentZhCn: publication.contentZhCn as Prisma.InputJsonValue,
        lastModifiedByUserId: actor.id,
        restoredFromPublicationId: publication.id,
        status: publication.status,
        version: { increment: 1 },
      },
      where: { pageKey: key, version: expectedDraftVersion },
    });
    if (updated.count !== 1) {
      const latest = await findCorePageDraft(transaction, key);
      throw new SiteContentError(
        "CONFLICT",
        [],
        latest ? corePageConflict(latest) : undefined,
      );
    }
    await transaction.auditLog.create({
      data: {
        actorRole: actor.role,
        actorUserId: actor.id,
        event: "CORE_PAGE_PUBLICATION_RESTORED",
        outcome: "SUCCESS",
        summary: `${CORE_PAGE_DEFINITIONS[key].label}历史版本 v${publication.version} 已恢复为新草稿。`,
        targetId: key,
        targetType: "CORE_PAGE",
      },
    });
    const restored = await findCorePageDraft(transaction, key);
    if (!restored) throw new SiteContentError("NOT_FOUND");
    return toCorePageDraft(key, restored);
  });
}

export async function archiveCorePage({
  actor,
  expectedDraftVersion,
  key,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  expectedDraftVersion: number;
  key: CorePageKey;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  const prisma = database(providedPrisma);
  return prisma.$transaction(async (transaction) => {
    const draft = await findCorePageDraft(transaction, key);
    if (!draft) throw new SiteContentError("NOT_FOUND");
    if (draft.version !== expectedDraftVersion) {
      throw new SiteContentError("CONFLICT", [], corePageConflict(draft));
    }
    const nextDraftVersion = draft.version + 1;
    const updated = await transaction.corePageDraft.updateMany({
      data: {
        lastModifiedByUserId: actor.id,
        lastPublishedVersion: nextDraftVersion,
        restoredFromPublicationId: null,
        status: "archived",
        version: nextDraftVersion,
      },
      where: { pageKey: key, version: expectedDraftVersion },
    });
    if (updated.count !== 1) {
      const latest = await findCorePageDraft(transaction, key);
      throw new SiteContentError(
        "CONFLICT",
        [],
        latest ? corePageConflict(latest) : undefined,
      );
    }
    const now = new Date();
    const publication = await transaction.corePagePublication.create({
      data: {
        contentEn: draft.contentEn as Prisma.InputJsonValue,
        contentZhCn: draft.contentZhCn as Prisma.InputJsonValue,
        pageKey: key,
        publishedAt: now,
        publishedByUserId: actor.id,
        sourceDraftVersion: nextDraftVersion,
        status: "archived",
        version: await nextCorePublicationVersion(transaction, key),
      },
    });
    await transaction.corePage.update({
      data: { currentPublicationId: publication.id },
      where: { key },
    });
    await transaction.corePagePublication.update({
      data: { sealedAt: now },
      where: { id: publication.id },
    });
    await transaction.auditLog.create({
      data: {
        actorRole: actor.role,
        actorUserId: actor.id,
        event: "CORE_PAGE_ARCHIVED",
        outcome: "SUCCESS",
        summary: `${CORE_PAGE_DEFINITIONS[key].label}已归档；前台隐藏，发布历史继续保留。`,
        targetId: key,
        targetType: "CORE_PAGE",
      },
    });
    return { publicationId: publication.id, version: publication.version };
  });
}

export async function listCorePagePublications({
  actor,
  key,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  key: CorePageKey;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  return database(providedPrisma).corePagePublication.findMany({
    include: { publishedBy: { select: { name: true } } },
    orderBy: { version: "desc" },
    where: { pageKey: key },
  });
}

export async function getPublishedCorePage({
  key,
  locale,
  prisma: providedPrisma,
}: {
  key: CorePageKey;
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}) {
  const page = await database(providedPrisma).corePage.findUnique({
    include: { currentPublication: true },
    where: { key },
  });
  const publication = page?.currentPublication;
  if (!publication || publication.status === "archived") return null;
  return {
    content: parseCorePageTranslation(
      key,
      locale === "en" ? publication.contentEn : publication.contentZhCn,
    ),
    key,
    publicationId: publication.id,
    publishedAt: publication.publishedAt,
    version: publication.version,
  };
}

export async function listPublishedCorePageKeys({
  prisma: providedPrisma,
}: { prisma?: ApplicationDatabase } = {}): Promise<CorePageKey[]> {
  const records = await database(providedPrisma).corePagePublication.findMany({
    select: { pageKey: true },
    where: { currentFor: { isNot: null }, status: "published" },
  });
  return records.map(({ pageKey }) => pageKey);
}

const articleInputSchema = z.object({
  body: z.string().max(50_000),
  excerpt: z.string().max(1_000),
  seoDescription: z.string().max(500),
  seoTitle: z.string().max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u),
  title: z.string().max(240),
});

export type ArticleDraftInput = z.infer<typeof articleInputSchema>;

function parseArticleDraftInput(input: ArticleDraftInput): ArticleDraftInput {
  const parsed = articleInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SiteContentError(
      "INVALID_CONTENT",
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  const richText = validateRestrictedRichText(parsed.data.body);
  if (!richText.success) {
    throw new SiteContentError(
      "INVALID_CONTENT",
      richText.issues.map((message) => ({ field: "body", message })),
    );
  }
  return parsed.data;
}

async function findArticleDraft(
  prisma: ContentDatabase,
  articleId: string,
  locale: "en" | "zh_cn",
) {
  return prisma.articleDraft.findUnique({
    include: {
      article: { select: { topicKey: true } },
      lastModifiedBy: { select: { name: true } },
      restoredFromPublication: { select: { version: true } },
    },
    where: { articleId_locale: { articleId, locale } },
  });
}

function toArticleDraft(
  record: NonNullable<Awaited<ReturnType<typeof findArticleDraft>>>,
) {
  return {
    articleId: record.articleId,
    body: record.body,
    currentPublicationId: record.currentPublicationId,
    excerpt: record.excerpt,
    lastModifiedAt: record.updatedAt,
    lastModifiedBy: record.lastModifiedBy?.name ?? "系统",
    lastPublishedVersion: record.lastPublishedVersion,
    locale: publicLocale(record.locale),
    restoredFromPublicationId: record.restoredFromPublicationId,
    restoredFromPublicationVersion:
      record.restoredFromPublication?.version ?? null,
    seoDescription: record.seoDescription,
    seoTitle: record.seoTitle,
    slug: record.slug,
    status: record.status,
    title: record.title,
    topicKey: record.article.topicKey,
    version: record.version,
  };
}

export async function getArticleDraft({
  actor,
  articleId,
  locale,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  articleId: string;
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  const record = await findArticleDraft(
    database(providedPrisma),
    articleId,
    dbLocale(locale),
  );
  if (!record) throw new SiteContentError("NOT_FOUND");
  return toArticleDraft(record);
}

export async function listArticleDrafts({
  actor,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  const articles = await database(providedPrisma).article.findMany({
    include: {
      drafts: {
        include: {
          lastModifiedBy: { select: { name: true } },
          restoredFromPublication: { select: { version: true } },
        },
      },
    },
    orderBy: { topicKey: "asc" },
  });
  return articles.map((article) => ({
    id: article.id,
    topicKey: article.topicKey,
    translations: Object.fromEntries(
      article.drafts.map((draft) => [
        publicLocale(draft.locale),
        toArticleDraft({ ...draft, article: { topicKey: article.topicKey } }),
      ]),
    ) as Partial<Record<PublicLocale, ReturnType<typeof toArticleDraft>>>,
  }));
}

export async function saveArticleDraft({
  actor,
  articleId,
  expectedDraftVersion,
  input,
  locale,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  articleId: string;
  expectedDraftVersion: number;
  input: ArticleDraftInput;
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  const parsed = parseArticleDraftInput(input);
  const localeValue = dbLocale(locale);
  const prisma = database(providedPrisma);
  return prisma.$transaction(async (transaction) => {
    const existing = await findArticleDraft(
      transaction,
      articleId,
      localeValue,
    );
    if (!existing) throw new SiteContentError("NOT_FOUND");
    if (existing.version !== expectedDraftVersion) {
      throw new SiteContentError("CONFLICT", [], articleConflict(existing));
    }
    const updated = await transaction.articleDraft.updateMany({
      data: {
        ...parsed,
        lastModifiedByUserId: actor.id,
        restoredFromPublicationId: null,
        version: { increment: 1 },
      },
      where: {
        articleId,
        locale: localeValue,
        version: expectedDraftVersion,
      },
    });
    if (updated.count !== 1) {
      const latest = await findArticleDraft(
        transaction,
        articleId,
        localeValue,
      );
      throw new SiteContentError(
        "CONFLICT",
        [],
        latest ? articleConflict(latest) : undefined,
      );
    }
    await transaction.auditLog.create({
      data: {
        actorRole: actor.role,
        actorUserId: actor.id,
        event: "ARTICLE_DRAFT_SAVED",
        outcome: "SUCCESS",
        summary: `${parsed.title || existing.article.topicKey}草稿已保存。`,
        targetId: articleId,
        targetType: "ARTICLE",
      },
    });
    const saved = await findArticleDraft(transaction, articleId, localeValue);
    if (!saved) throw new SiteContentError("NOT_FOUND");
    return toArticleDraft(saved);
  });
}

function articlePublicationErrors(record: {
  body: string;
  excerpt: string;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  title: string;
}) {
  const errors: Array<{ field: string; message: string }> = [];
  for (const field of [
    "title",
    "slug",
    "excerpt",
    "body",
    "seoTitle",
    "seoDescription",
  ] as const) {
    if (!record[field].trim()) {
      errors.push({ field, message: "发布前必须填写。" });
    }
  }
  const richText = validateRestrictedRichText(record.body);
  if (!richText.success) {
    errors.push(
      ...richText.issues.map((message) => ({ field: "body", message })),
    );
  }
  return errors;
}

async function nextArticlePublicationVersion(
  transaction: Prisma.TransactionClient,
  articleId: string,
  locale: "en" | "zh_cn",
) {
  const latest = await transaction.articlePublication.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
    where: { articleId, locale },
  });
  return (latest?.version ?? 0) + 1;
}

export async function publishArticleDraft({
  actor,
  articleId,
  expectedDraftVersion,
  locale,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  articleId: string;
  expectedDraftVersion: number;
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  const localeValue = dbLocale(locale);
  const prisma = database(providedPrisma);
  return prisma.$transaction(async (transaction) => {
    const draft = await findArticleDraft(transaction, articleId, localeValue);
    if (!draft) throw new SiteContentError("NOT_FOUND");
    if (draft.version !== expectedDraftVersion) {
      throw new SiteContentError("CONFLICT", [], articleConflict(draft));
    }
    const errors = articlePublicationErrors(draft);
    if (errors.length > 0) {
      throw new SiteContentError("PUBLISH_VALIDATION_FAILED", errors);
    }
    if (draft.lastPublishedVersion === draft.version) {
      throw new SiteContentError("NOTHING_TO_PUBLISH");
    }
    const claim = await transaction.articleDraft.updateMany({
      data: { lastPublishedVersion: draft.version },
      where: {
        articleId,
        locale: localeValue,
        version: expectedDraftVersion,
        OR: [
          { lastPublishedVersion: null },
          { lastPublishedVersion: { not: draft.version } },
        ],
      },
    });
    if (claim.count !== 1) {
      const latest = await findArticleDraft(
        transaction,
        articleId,
        localeValue,
      );
      if (latest && latest.version !== expectedDraftVersion) {
        throw new SiteContentError("CONFLICT", [], articleConflict(latest));
      }
      throw new SiteContentError("NOTHING_TO_PUBLISH");
    }

    const now = new Date();
    const publication = await transaction.articlePublication.create({
      data: {
        articleId,
        body: draft.body,
        excerpt: draft.excerpt,
        locale: localeValue,
        publishedAt: now,
        publishedByUserId: actor.id,
        restoredFromPublicationId: draft.restoredFromPublicationId,
        seoDescription: draft.seoDescription,
        seoTitle: draft.seoTitle,
        slug: draft.slug,
        sourceDraftVersion: draft.version,
        status: draft.status,
        title: draft.title,
        version: await nextArticlePublicationVersion(
          transaction,
          articleId,
          localeValue,
        ),
      },
    });
    await transaction.articleDraft.update({
      data: { currentPublicationId: publication.id },
      where: { articleId_locale: { articleId, locale: localeValue } },
    });
    await transaction.articlePublication.update({
      data: { sealedAt: now },
      where: { id: publication.id },
    });
    await transaction.auditLog.create({
      data: {
        actorRole: actor.role,
        actorUserId: actor.id,
        event: "ARTICLE_PUBLISHED",
        outcome: "SUCCESS",
        summary: `${draft.title}形成${locale === "en" ? "英文" : "中文"}不可变发布版本 v${publication.version}。`,
        targetId: articleId,
        targetType: "ARTICLE",
      },
    });
    return { publicationId: publication.id, version: publication.version };
  });
}

export async function restoreArticlePublication({
  actor,
  articleId,
  expectedDraftVersion,
  locale,
  prisma: providedPrisma,
  publicationId,
}: {
  actor: AdminActor;
  articleId: string;
  expectedDraftVersion: number;
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
  publicationId: string;
}) {
  assertContentManager(actor);
  const localeValue = dbLocale(locale);
  const prisma = database(providedPrisma);
  return prisma.$transaction(async (transaction) => {
    const [draft, publication] = await Promise.all([
      findArticleDraft(transaction, articleId, localeValue),
      transaction.articlePublication.findFirst({
        where: { articleId, id: publicationId, locale: localeValue },
      }),
    ]);
    if (!draft || !publication) throw new SiteContentError("NOT_FOUND");
    if (draft.version !== expectedDraftVersion) {
      throw new SiteContentError("CONFLICT", [], articleConflict(draft));
    }
    const updated = await transaction.articleDraft.updateMany({
      data: {
        body: publication.body,
        excerpt: publication.excerpt,
        lastModifiedByUserId: actor.id,
        restoredFromPublicationId: publication.id,
        seoDescription: publication.seoDescription,
        seoTitle: publication.seoTitle,
        slug: publication.slug,
        status: publication.status,
        title: publication.title,
        version: { increment: 1 },
      },
      where: {
        articleId,
        locale: localeValue,
        version: expectedDraftVersion,
      },
    });
    if (updated.count !== 1) {
      const latest = await findArticleDraft(
        transaction,
        articleId,
        localeValue,
      );
      throw new SiteContentError(
        "CONFLICT",
        [],
        latest ? articleConflict(latest) : undefined,
      );
    }
    await transaction.auditLog.create({
      data: {
        actorRole: actor.role,
        actorUserId: actor.id,
        event: "ARTICLE_PUBLICATION_RESTORED",
        outcome: "SUCCESS",
        summary: `${publication.title}历史版本 v${publication.version} 已恢复为新草稿。`,
        targetId: articleId,
        targetType: "ARTICLE",
      },
    });
    const restored = await findArticleDraft(
      transaction,
      articleId,
      localeValue,
    );
    if (!restored) throw new SiteContentError("NOT_FOUND");
    return toArticleDraft(restored);
  });
}

export async function archiveArticle({
  actor,
  articleId,
  expectedDraftVersion,
  locale,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  articleId: string;
  expectedDraftVersion: number;
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  const localeValue = dbLocale(locale);
  const prisma = database(providedPrisma);
  return prisma.$transaction(async (transaction) => {
    const draft = await findArticleDraft(transaction, articleId, localeValue);
    if (!draft) throw new SiteContentError("NOT_FOUND");
    if (draft.version !== expectedDraftVersion) {
      throw new SiteContentError("CONFLICT", [], articleConflict(draft));
    }
    const nextDraftVersion = draft.version + 1;
    const updated = await transaction.articleDraft.updateMany({
      data: {
        lastModifiedByUserId: actor.id,
        lastPublishedVersion: nextDraftVersion,
        restoredFromPublicationId: null,
        status: "archived",
        version: nextDraftVersion,
      },
      where: {
        articleId,
        locale: localeValue,
        version: expectedDraftVersion,
      },
    });
    if (updated.count !== 1) {
      const latest = await findArticleDraft(
        transaction,
        articleId,
        localeValue,
      );
      throw new SiteContentError(
        "CONFLICT",
        [],
        latest ? articleConflict(latest) : undefined,
      );
    }
    const now = new Date();
    const publication = await transaction.articlePublication.create({
      data: {
        articleId,
        body: draft.body,
        excerpt: draft.excerpt,
        locale: localeValue,
        publishedAt: now,
        publishedByUserId: actor.id,
        seoDescription: draft.seoDescription,
        seoTitle: draft.seoTitle,
        slug: draft.slug,
        sourceDraftVersion: nextDraftVersion,
        status: "archived",
        title: draft.title,
        version: await nextArticlePublicationVersion(
          transaction,
          articleId,
          localeValue,
        ),
      },
    });
    await transaction.articleDraft.update({
      data: { currentPublicationId: publication.id },
      where: { articleId_locale: { articleId, locale: localeValue } },
    });
    await transaction.articlePublication.update({
      data: { sealedAt: now },
      where: { id: publication.id },
    });
    await transaction.auditLog.create({
      data: {
        actorRole: actor.role,
        actorUserId: actor.id,
        event: "ARTICLE_ARCHIVED",
        outcome: "SUCCESS",
        summary: `${draft.title}已归档；前台隐藏，发布历史继续保留。`,
        targetId: articleId,
        targetType: "ARTICLE",
      },
    });
    return { publicationId: publication.id, version: publication.version };
  });
}

export async function listArticlePublications({
  actor,
  articleId,
  locale,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  articleId: string;
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}) {
  assertContentManager(actor);
  return database(providedPrisma).articlePublication.findMany({
    include: { publishedBy: { select: { name: true } } },
    orderBy: { version: "desc" },
    where: { articleId, locale: dbLocale(locale) },
  });
}

export async function listPublishedArticles({
  locale,
  prisma: providedPrisma,
}: {
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
}) {
  const publications = await database(
    providedPrisma,
  ).articlePublication.findMany({
    orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
    where: {
      currentFor: { isNot: null },
      locale: dbLocale(locale),
      status: "published",
    },
  });
  return publications.map((publication) => ({
    articleId: publication.articleId,
    excerpt: publication.excerpt,
    locale,
    publicationId: publication.id,
    publishedAt: publication.publishedAt,
    slug: publication.slug,
    title: publication.title,
  }));
}

export async function getPublishedArticle({
  locale,
  prisma: providedPrisma,
  slug,
}: {
  locale: PublicLocale;
  prisma?: ApplicationDatabase;
  slug: string;
}) {
  const publication = await database(
    providedPrisma,
  ).articlePublication.findFirst({
    include: {
      article: {
        include: {
          drafts: {
            include: { currentPublication: true },
          },
        },
      },
    },
    where: {
      currentFor: { isNot: null },
      locale: dbLocale(locale),
      slug,
      status: "published",
    },
  });
  if (!publication) return null;
  const otherLocale: PublicLocale = locale === "en" ? "zh-cn" : "en";
  const otherDraft = publication.article.drafts.find(
    (draft) => draft.locale === dbLocale(otherLocale),
  );
  const otherPublication =
    otherDraft?.currentPublication?.status === "published"
      ? otherDraft.currentPublication
      : null;
  return {
    articleId: publication.articleId,
    body: publication.body,
    excerpt: publication.excerpt,
    locale,
    otherLanguage: otherPublication
      ? {
          available: true as const,
          locale: otherLocale,
          slug: otherPublication.slug,
        }
      : { available: false as const, locale: otherLocale },
    publicationId: publication.id,
    publishedAt: publication.publishedAt,
    seoDescription: publication.seoDescription,
    seoTitle: publication.seoTitle,
    slug: publication.slug,
    title: publication.title,
    version: publication.version,
  };
}

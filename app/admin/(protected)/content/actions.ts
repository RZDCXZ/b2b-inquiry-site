"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  archiveArticle,
  archiveCorePage,
  publishArticleDraft,
  publishCorePageDraft,
  restoreArticlePublication,
  restoreCorePagePublication,
  saveArticleDraft,
  saveCorePageDraft,
  SiteContentError,
} from "@/src/application/site-content-management";
import {
  CORE_PAGE_DEFINITIONS,
  CORE_PAGE_KEYS,
  type CorePageKey,
  type CorePageTranslation,
} from "@/src/modules/content-publishing/public/core-page-contracts";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export type ContentMutationState = {
  conflict?: {
    latestModifiedAt: string;
    latestModifiedBy: string;
    latestVersion: number;
  };
  fieldErrors?: Record<string, string>;
  message: string;
  status: "error" | "idle" | "success";
  version?: number;
};

const identitySchema = z.object({
  expectedDraftVersion: z.coerce.number().int().positive(),
});

async function authorizedActor(path: string) {
  const authorization = await authorizeAdminPage(
    PERMISSIONS.CONTENT_MANAGE,
    path,
  );
  if (!authorization.allowed) throw new SiteContentError("FORBIDDEN");
  return authorization.actor;
}

function errorState(error: unknown): ContentMutationState {
  if (!(error instanceof SiteContentError)) {
    return { message: "操作未完成，请重试。", status: "error" };
  }
  const messages: Record<SiteContentError["code"], string> = {
    CONFLICT: "草稿已由其他窗口更新，本次操作未覆盖较新内容。",
    FORBIDDEN: "你没有维护内容发布的权限。",
    INVALID_CONTENT: "草稿格式无效，请检查字段与富文本白名单。",
    NOTHING_TO_PUBLISH: "当前草稿没有尚未发布的修改。",
    NOT_FOUND: "页面、文章或发布版本不存在。",
    PUBLISH_VALIDATION_FAILED: "内容尚未满足发布条件。",
  };
  return {
    conflict: error.conflict
      ? {
          latestModifiedAt: error.conflict.latestModifiedAt.toISOString(),
          latestModifiedBy: error.conflict.latestModifiedBy,
          latestVersion: error.conflict.latestVersion,
        }
      : undefined,
    fieldErrors: Object.fromEntries(
      error.fieldErrors.map(({ field, message }) => [field, message]),
    ),
    message: messages[error.code],
    status: "error",
  };
}

function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function parseCorePageTranslation(
  formData: FormData,
  key: CorePageKey,
  prefix: "en" | "zhCn",
): CorePageTranslation {
  return {
    eyebrow: formText(formData, `${prefix}:eyebrow`),
    lede: formText(formData, `${prefix}:lede`),
    sections: CORE_PAGE_DEFINITIONS[key].sections.map(({ id }) => ({
      body: formText(formData, `${prefix}:section:${id}:body`),
      heading: formText(formData, `${prefix}:section:${id}:heading`),
      id,
    })),
    title: formText(formData, `${prefix}:title`),
  };
}

const corePageIdentitySchema = identitySchema.extend({
  key: z.enum(CORE_PAGE_KEYS),
});

function revalidateCorePage(key: CorePageKey) {
  const route = CORE_PAGE_DEFINITIONS[key].route;
  revalidatePath(`/en${route}`);
  revalidatePath(`/zh-cn${route}`);
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/pages/${key}`);
}

export async function saveCorePageAction(
  _previousState: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const parsed = corePageIdentitySchema.safeParse({
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    key: formData.get("key"),
  });
  if (!parsed.success) return { message: "保存请求无效。", status: "error" };
  try {
    const actor = await authorizedActor(
      `/admin/content/pages/${parsed.data.key}`,
    );
    const saved = await saveCorePageDraft({
      actor,
      expectedDraftVersion: parsed.data.expectedDraftVersion,
      input: {
        contentEn: parseCorePageTranslation(formData, parsed.data.key, "en"),
        contentZhCn: parseCorePageTranslation(
          formData,
          parsed.data.key,
          "zhCn",
        ),
      },
      key: parsed.data.key,
    });
    revalidateCorePage(parsed.data.key);
    return {
      message: "双语页面草稿已保存，当前公开版本未改变。",
      status: "success",
      version: saved.version,
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function publishCorePageAction(
  _previousState: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const parsed = corePageIdentitySchema.safeParse({
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    key: formData.get("key"),
  });
  if (!parsed.success) return { message: "发布请求无效。", status: "error" };
  try {
    const actor = await authorizedActor(
      `/admin/content/pages/${parsed.data.key}`,
    );
    const result = await publishCorePageDraft({
      actor,
      expectedDraftVersion: parsed.data.expectedDraftVersion,
      key: parsed.data.key,
    });
    revalidateCorePage(parsed.data.key);
    return {
      message: `已创建双语不可变发布版本 v${result.version}。`,
      status: "success",
      version: parsed.data.expectedDraftVersion,
    };
  } catch (error) {
    return errorState(error);
  }
}

const coreRestoreSchema = corePageIdentitySchema.extend({
  publicationId: z.string().uuid(),
});

export async function restoreCorePageAction(
  _previousState: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const parsed = coreRestoreSchema.safeParse({
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    key: formData.get("key"),
    publicationId: formData.get("publicationId"),
  });
  if (!parsed.success) return { message: "恢复请求无效。", status: "error" };
  try {
    const actor = await authorizedActor(
      `/admin/content/pages/${parsed.data.key}`,
    );
    const restored = await restoreCorePagePublication({
      actor,
      ...parsed.data,
    });
    revalidateCorePage(parsed.data.key);
    return {
      message: "历史版本已恢复为新草稿；当前公开页面未改变。",
      status: "success",
      version: restored.version,
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function archiveCorePageAction(
  _previousState: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const parsed = corePageIdentitySchema.safeParse({
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    key: formData.get("key"),
  });
  if (!parsed.success) return { message: "归档请求无效。", status: "error" };
  try {
    const actor = await authorizedActor(
      `/admin/content/pages/${parsed.data.key}`,
    );
    await archiveCorePage({ actor, ...parsed.data });
    revalidateCorePage(parsed.data.key);
    return {
      message: "页面已归档并从前台隐藏，历史版本继续保留。",
      status: "success",
      version: parsed.data.expectedDraftVersion + 1,
    };
  } catch (error) {
    return errorState(error);
  }
}

const articleIdentitySchema = identitySchema.extend({
  articleId: z.string().trim().min(1).max(120),
  locale: z.enum(["en", "zh-cn"]),
});

function revalidateArticle(articleId: string, locale: "en" | "zh-cn") {
  revalidatePath("/en/resources");
  revalidatePath("/zh-cn/resources");
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/articles/${articleId}/${locale}`);
}

export async function saveArticleAction(
  _previousState: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const parsed = articleIdentitySchema.safeParse({
    articleId: formData.get("articleId"),
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) return { message: "保存请求无效。", status: "error" };
  try {
    const actor = await authorizedActor(
      `/admin/content/articles/${parsed.data.articleId}/${parsed.data.locale}`,
    );
    const saved = await saveArticleDraft({
      actor,
      ...parsed.data,
      input: {
        body: formText(formData, "body"),
        excerpt: formText(formData, "excerpt"),
        seoDescription: formText(formData, "seoDescription"),
        seoTitle: formText(formData, "seoTitle"),
        slug: formText(formData, "slug"),
        title: formText(formData, "title"),
      },
    });
    revalidateArticle(parsed.data.articleId, parsed.data.locale);
    return {
      message: "文章语言草稿已保存，当前公开版本未改变。",
      status: "success",
      version: saved.version,
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function publishArticleAction(
  _previousState: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const parsed = articleIdentitySchema.safeParse({
    articleId: formData.get("articleId"),
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) return { message: "发布请求无效。", status: "error" };
  try {
    const actor = await authorizedActor(
      `/admin/content/articles/${parsed.data.articleId}/${parsed.data.locale}`,
    );
    const result = await publishArticleDraft({ actor, ...parsed.data });
    revalidateArticle(parsed.data.articleId, parsed.data.locale);
    return {
      message: `已创建该语言不可变发布版本 v${result.version}。`,
      status: "success",
      version: parsed.data.expectedDraftVersion,
    };
  } catch (error) {
    return errorState(error);
  }
}

const articleRestoreSchema = articleIdentitySchema.extend({
  publicationId: z.string().uuid(),
});

export async function restoreArticleAction(
  _previousState: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const parsed = articleRestoreSchema.safeParse({
    articleId: formData.get("articleId"),
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    locale: formData.get("locale"),
    publicationId: formData.get("publicationId"),
  });
  if (!parsed.success) return { message: "恢复请求无效。", status: "error" };
  try {
    const actor = await authorizedActor(
      `/admin/content/articles/${parsed.data.articleId}/${parsed.data.locale}`,
    );
    const restored = await restoreArticlePublication({ actor, ...parsed.data });
    revalidateArticle(parsed.data.articleId, parsed.data.locale);
    return {
      message: "历史版本已恢复为新草稿；当前公开文章未改变。",
      status: "success",
      version: restored.version,
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function archiveArticleAction(
  _previousState: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const parsed = articleIdentitySchema.safeParse({
    articleId: formData.get("articleId"),
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) return { message: "归档请求无效。", status: "error" };
  try {
    const actor = await authorizedActor(
      `/admin/content/articles/${parsed.data.articleId}/${parsed.data.locale}`,
    );
    await archiveArticle({ actor, ...parsed.data });
    revalidateArticle(parsed.data.articleId, parsed.data.locale);
    return {
      message: "该语言文章已归档并从前台隐藏，历史版本继续保留。",
      status: "success",
      version: parsed.data.expectedDraftVersion + 1,
    };
  } catch (error) {
    return errorState(error);
  }
}

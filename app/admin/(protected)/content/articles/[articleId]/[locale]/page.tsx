import { notFound } from "next/navigation";

import {
  getArticleDraft,
  listArticlePublications,
  SiteContentError,
} from "@/src/application/site-content-management";
import { PermissionDenied } from "@/src/components/admin/admin-page";
import { ArticleEditor } from "@/src/components/admin/article-editor";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

export default async function ArticleEditorRoute({
  params,
}: {
  params: Promise<{ articleId: string; locale: string }>;
}) {
  const { articleId, locale } = await params;
  if (locale !== "en" && locale !== "zh-cn") notFound();
  const articleLocale = locale as PublicLocale;
  const path = `/admin/content/articles/${encodeURIComponent(articleId)}/${articleLocale}`;
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.CONTENT_MANAGE,
    path,
  );
  if (!allowed) return <PermissionDenied role={actor.role} />;
  const result = await Promise.all([
    getArticleDraft({ actor, articleId, locale: articleLocale }),
    listArticlePublications({ actor, articleId, locale: articleLocale }),
  ]).then(
    ([draft, publications]) => ({
      draft,
      publications,
      status: "success" as const,
    }),
    (error: unknown) => ({ error, status: "error" as const }),
  );
  if (result.status === "error") {
    if (
      result.error instanceof SiteContentError &&
      result.error.code === "NOT_FOUND"
    )
      notFound();
    throw result.error;
  }
  return (
    <ArticleEditor
      draft={{
        articleId: result.draft.articleId,
        body: result.draft.body,
        excerpt: result.draft.excerpt,
        lastModifiedAt: result.draft.lastModifiedAt.toISOString(),
        lastModifiedBy: result.draft.lastModifiedBy,
        lastPublishedVersion: result.draft.lastPublishedVersion,
        locale: result.draft.locale,
        seoDescription: result.draft.seoDescription,
        seoTitle: result.draft.seoTitle,
        slug: result.draft.slug,
        status: result.draft.status,
        title: result.draft.title,
        version: result.draft.version,
      }}
      publications={result.publications.map((publication) => ({
        current: result.draft.currentPublicationId === publication.id,
        id: publication.id,
        publishedAt: publication.publishedAt.toISOString(),
        publishedBy: publication.publishedBy?.name ?? "系统",
        restored: publication.restoredFromPublicationId !== null,
        status: publication.status,
        summary:
          publication.status === "archived"
            ? "归档文章快照"
            : publication.restoredFromPublicationId
              ? "历史内容恢复后重新发布"
              : `发布《${publication.title}》`,
        version: publication.version,
      }))}
    />
  );
}

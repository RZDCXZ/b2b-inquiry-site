import { notFound } from "next/navigation";

import {
  getArticleDraft,
  SiteContentError,
} from "@/src/application/site-content-management";
import { PermissionDenied } from "@/src/components/admin/admin-page";
import { ContentDraftPreview } from "@/src/components/admin/content-draft-preview";
import { ArticlePage } from "@/src/components/public/article-page";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";
import {
  isPublicLocale,
  type PublicLocale,
} from "@/src/modules/site-config/public/locales";

export default async function ArticleDraftPreviewRoute({
  params,
}: {
  params: Promise<{ articleId: string; locale: string }>;
}) {
  const { articleId, locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const previewLocale = locale as PublicLocale;
  const path = `/admin/content/articles/${encodeURIComponent(articleId)}/${previewLocale}/preview`;
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.CONTENT_MANAGE,
    path,
  );
  if (!allowed) return <PermissionDenied role={actor.role} />;

  const result = await getArticleDraft({
    actor,
    articleId,
    locale: previewLocale,
  }).then(
    (draft) => ({ draft, status: "success" as const }),
    (error: unknown) => ({ error, status: "error" as const }),
  );
  if (result.status === "error") {
    if (
      result.error instanceof SiteContentError &&
      result.error.code === "NOT_FOUND"
    ) {
      notFound();
    }
    throw result.error;
  }
  const otherLocale: PublicLocale = previewLocale === "en" ? "zh-cn" : "en";

  return (
    <ContentDraftPreview locale={previewLocale} version={result.draft.version}>
      <ArticlePage
        article={{
          body: result.draft.body,
          excerpt: result.draft.excerpt,
          otherLanguage: { available: false, locale: otherLocale },
          publishedAt: result.draft.lastModifiedAt,
          slug: result.draft.slug,
          title: result.draft.title,
        }}
        locale={previewLocale}
      />
    </ContentDraftPreview>
  );
}

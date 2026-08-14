import { notFound } from "next/navigation";
import Link from "next/link";

import {
  getArticleDraft,
  SiteContentError,
} from "@/src/application/site-content-management";
import { getPublicSiteShellData } from "@/src/application/public-site-shell";
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
  const [otherDraft, shell] = await Promise.all([
    getArticleDraft({ actor, articleId, locale: otherLocale }).catch(
      (error: unknown) => {
        if (error instanceof SiteContentError && error.code === "NOT_FOUND") {
          return null;
        }
        throw error;
      },
    ),
    getPublicSiteShellData({ locale: previewLocale }),
  ]);
  const previewPath = (targetLocale: PublicLocale) =>
    `/admin/content/articles/${encodeURIComponent(articleId)}/${targetLocale}/preview`;

  return (
    <ContentDraftPreview
      actions={
        <>
          <Link href={previewPath("en")}>English 草稿预览</Link>
          {otherDraft || previewLocale === "zh-cn" ? (
            <Link href={previewPath("zh-cn")}>简中草稿预览</Link>
          ) : (
            <span aria-disabled="true">简中暂无草稿</span>
          )}
        </>
      }
      locale={previewLocale}
      version={result.draft.version}
    >
      <ArticlePage
        article={{
          body: result.draft.body,
          excerpt: result.draft.excerpt,
          otherLanguage: otherDraft
            ? { available: true, locale: otherLocale, slug: otherDraft.slug }
            : { available: false, locale: otherLocale },
          publishedAt: result.draft.lastModifiedAt,
          slug: result.draft.slug,
          title: result.draft.title,
        }}
        languageHrefs={{
          [previewLocale]: previewPath(previewLocale),
          ...(otherDraft ? { [otherLocale]: previewPath(otherLocale) } : {}),
        }}
        locale={previewLocale}
        shell={shell}
      />
    </ContentDraftPreview>
  );
}

import { notFound } from "next/navigation";

import {
  getCorePageDraft,
  listCorePagePublications,
  SiteContentError,
} from "@/src/application/site-content-management";
import { PermissionDenied } from "@/src/components/admin/admin-page";
import { CorePageEditor } from "@/src/components/admin/core-page-editor";
import {
  CORE_PAGE_KEYS,
  type CorePageKey,
} from "@/src/modules/content-publishing/public/core-page-contracts";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function CorePageEditorRoute({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!CORE_PAGE_KEYS.includes(key as CorePageKey)) notFound();
  const pageKey = key as CorePageKey;
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.CONTENT_MANAGE,
    `/admin/content/pages/${pageKey}`,
  );
  if (!allowed) return <PermissionDenied role={actor.role} />;
  const result = await Promise.all([
    getCorePageDraft({ actor, key: pageKey }),
    listCorePagePublications({ actor, key: pageKey }),
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
    <CorePageEditor
      draft={{
        ...result.draft,
        lastModifiedAt: result.draft.lastModifiedAt.toISOString(),
      }}
      publications={result.publications.map((publication) => ({
        current: result.draft.currentPublicationId === publication.id,
        id: publication.id,
        publishedAt: publication.publishedAt.toISOString(),
        publishedBy: publication.publishedBy?.name ?? "系统",
        restored: publication.restoredFromPublicationId !== null,
        status: publication.status,
        version: publication.version,
      }))}
    />
  );
}

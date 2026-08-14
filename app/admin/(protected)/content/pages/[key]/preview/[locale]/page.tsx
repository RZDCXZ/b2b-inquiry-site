import { notFound } from "next/navigation";

import { listPublishedVehicleFitmentOptions } from "@/src/application/public-catalog";
import {
  getCorePageDraft,
  listPublishedArticles,
  SiteContentError,
} from "@/src/application/site-content-management";
import { getPublicSiteShellData } from "@/src/application/public-site-shell";
import { ContentDraftPreview } from "@/src/components/admin/content-draft-preview";
import { PermissionDenied } from "@/src/components/admin/admin-page";
import { CoreContentPage } from "@/src/components/public/core-content-page";
import { HomePage } from "@/src/components/public/home-page";
import { InquiryFormPage } from "@/src/components/public/inquiry-form-page";
import {
  CORE_PAGE_KEYS,
  type CorePageKey,
} from "@/src/modules/content-publishing/public/core-page-contracts";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";
import {
  isPublicLocale,
  type PublicLocale,
} from "@/src/modules/site-config/public/locales";

const navigationAnchorByKey: Record<CorePageKey, string> = {
  about: "about",
  contact: "contact",
  home: "",
  manufacturing_quality: "quality",
  private_label: "private-label",
  technical_resources: "resources",
};

export default async function CorePageDraftPreviewRoute({
  params,
}: {
  params: Promise<{ key: string; locale: string }>;
}) {
  const { key, locale } = await params;
  if (!CORE_PAGE_KEYS.includes(key as CorePageKey) || !isPublicLocale(locale)) {
    notFound();
  }
  const pageKey = key as CorePageKey;
  const path = `/admin/content/pages/${pageKey}/preview/${locale}`;
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.CONTENT_MANAGE,
    path,
  );
  if (!allowed) return <PermissionDenied role={actor.role} />;

  const result = await getCorePageDraft({ actor, key: pageKey }).then(
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

  const previewLocale = locale as PublicLocale;
  const content =
    previewLocale === "en" ? result.draft.contentEn : result.draft.contentZhCn;
  const shell = await getPublicSiteShellData({ locale: previewLocale });
  let preview;
  if (pageKey === "home") {
    const vehicleFitments = await listPublishedVehicleFitmentOptions({
      locale: previewLocale,
    });
    preview = (
      <HomePage
        content={content}
        locale={previewLocale}
        shell={shell}
        vehicleFitments={vehicleFitments}
      />
    );
  } else if (pageKey === "contact") {
    preview = (
      <InquiryFormPage
        contactContent={content}
        fieldErrors={[]}
        locale={previewLocale}
        product={null}
        shell={shell}
        token="draft-preview"
      />
    );
  } else {
    const articles =
      pageKey === "technical_resources"
        ? await listPublishedArticles({ locale: previewLocale })
        : [];
    preview = (
      <CoreContentPage
        activeNavigationAnchor={navigationAnchorByKey[pageKey]}
        articles={articles}
        content={content}
        locale={previewLocale}
        shell={shell}
      />
    );
  }

  return (
    <ContentDraftPreview locale={previewLocale} version={result.draft.version}>
      {preview}
    </ContentDraftPreview>
  );
}

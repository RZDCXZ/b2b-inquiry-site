import { notFound } from "next/navigation";

import {
  getProductDraftPreview,
  ProductPublishingError,
} from "@/src/application/product-publishing";
import { PermissionDenied } from "@/src/components/admin/admin-page";
import { ProductDraftPreview } from "@/src/components/admin/product-draft-preview";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";
import { PUBLIC_LOCALE_SCHEMA } from "@/src/modules/site-config/public/locales";

export default async function ProductPreviewPage({
  params,
}: PageProps<"/admin/products/[partNumber]/preview/[locale]">) {
  const { locale, partNumber } = await params;
  const parsedLocale = PUBLIC_LOCALE_SCHEMA.safeParse(locale);

  if (!parsedLocale.success) {
    notFound();
  }

  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.PRODUCTS_MANAGE,
    "/admin/products/" +
      encodeURIComponent(partNumber) +
      "/preview/" +
      parsedLocale.data,
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  const result = await getProductDraftPreview({
    actor,
    locale: parsedLocale.data,
    partNumber,
  }).then(
    (preview) => ({ preview, status: "success" as const }),
    (error: unknown) => ({ error, status: "error" as const }),
  );

  if (result.status === "error") {
    if (
      result.error instanceof ProductPublishingError &&
      result.error.code === "NOT_FOUND"
    ) {
      notFound();
    }
    throw result.error;
  }

  return <ProductDraftPreview preview={result.preview} />;
}

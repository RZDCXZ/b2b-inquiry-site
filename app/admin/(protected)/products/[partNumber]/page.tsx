import { notFound } from "next/navigation";

import {
  getProductDraft,
  ProductPublishingError,
} from "@/src/application/product-publishing";
import {
  ProductEditor,
  type ProductEditorDraftView,
} from "@/src/components/admin/product-editor";
import { PermissionDenied } from "@/src/components/admin/admin-page";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function ProductEditorPage({
  params,
}: PageProps<"/admin/products/[partNumber]">) {
  const { partNumber } = await params;
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.PRODUCTS_MANAGE,
    "/admin/products/" + encodeURIComponent(partNumber),
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  const result = await getProductDraft({ actor, partNumber }).then(
    (draft) => ({ draft, status: "success" as const }),
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

  const draft = result.draft;
  const valueByAttributeId = new Map(
    draft.specificationValues.map((value) => [value.attributeId, value]),
  );
  const view: ProductEditorDraftView = {
    categoryId: draft.categoryId,
    categoryName: draft.category.nameZhCn,
    currentPublicationId: draft.currentPublicationId,
    descriptionEn: draft.descriptionEn,
    descriptionZhCn: draft.descriptionZhCn,
    fitmentSummaryEn: draft.fitmentSummaryEn,
    fitmentSummaryZhCn: draft.fitmentSummaryZhCn,
    imageAltEn: draft.imageAltEn,
    imageAltZhCn: draft.imageAltZhCn,
    imagePath: draft.imagePath,
    lastModifiedAt: draft.updatedAt.toISOString(),
    lastModifiedBy: draft.lastModifiedBy?.name ?? "系统",
    lastPublishedVersion: draft.lastPublishedVersion,
    nameEn: draft.nameEn,
    nameZhCn: draft.nameZhCn,
    partNumber: draft.partNumber,
    productStatus: draft.productStatus,
    publicationReadiness: draft.publicationReadiness,
    publications: draft.publications.map((publication) => ({
      current: publication.id === draft.currentPublicationId,
      id: publication.id,
      publishedAt: publication.publishedAt.toISOString(),
      publishedBy: publication.publishedBy?.name ?? "系统",
      restored: publication.restoredFromPublicationId !== null,
      version: publication.version,
    })),
    references: draft.references.map(({ brand, referenceNumber }) => ({
      brand,
      referenceNumber,
    })),
    replacementPartNumber: draft.replacementProduct?.partNumber ?? null,
    seoDescriptionEn: draft.seoDescriptionEn,
    seoDescriptionZhCn: draft.seoDescriptionZhCn,
    seoTitleEn: draft.seoTitleEn,
    seoTitleZhCn: draft.seoTitleZhCn,
    slugEn: draft.slugEn,
    slugZhCn: draft.slugZhCn,
    specifications: draft.category.specificationAttributes.map((definition) => {
      const value = valueByAttributeId.get(definition.id);
      return {
        baseUnit: definition.baseUnit,
        booleanValue: value?.booleanValue ?? null,
        code: definition.code,
        dataType: definition.dataType,
        decimalValue: value?.decimalValue?.toNumber() ?? null,
        enumerationValue: value?.enumerationValue ?? null,
        label: definition.nameZhCn,
        options: definition.options.map((option) => ({
          code: option.code,
          label: option.labelZhCn,
        })),
        required: definition.required,
        textValue: value?.textValue ?? null,
      };
    }),
    status: draft.status === "discontinued" ? "discontinued" : "published",
    summaryEn: draft.summaryEn,
    summaryZhCn: draft.summaryZhCn,
    version: draft.version,
  };

  return <ProductEditor draft={view} key={view.version} />;
}

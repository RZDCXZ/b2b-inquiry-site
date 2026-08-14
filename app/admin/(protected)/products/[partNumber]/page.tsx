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
  const definitionById = new Map(
    draft.category.specificationAttributes.map((definition) => [
      definition.id,
      definition,
    ]),
  );
  const view: ProductEditorDraftView = {
    categoryId: draft.categoryId,
    categoryName: draft.category.nameZhCn,
    currentPublicationId: draft.currentPublicationId,
    descriptionEn: draft.descriptionEn,
    descriptionZhCn: draft.descriptionZhCn,
    fitmentCount: draft.fitments.length,
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
    specifications: draft.specificationValues.map((value) => {
      const definition = definitionById.get(value.attributeId);
      return {
        baseUnit: value.baseUnit,
        booleanValue: value.booleanValue,
        code: value.attributeCode,
        dataType: value.dataType,
        decimalValue: value.decimalValue?.toNumber() ?? null,
        enumerationValue: value.enumerationValue,
        label: value.nameZhCn,
        options:
          definition?.options.map((option) => ({
            code: option.code,
            label: option.labelZhCn,
          })) ?? [],
        textValue: value.textValue,
      };
    }),
    status: draft.status === "discontinued" ? "discontinued" : "published",
    summaryEn: draft.summaryEn,
    summaryZhCn: draft.summaryZhCn,
    version: draft.version,
  };

  return <ProductEditor draft={view} key={view.version} />;
}

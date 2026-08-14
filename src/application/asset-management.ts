import { randomUUID } from "node:crypto";

import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import {
  DEFAULT_UPLOAD_DIRECTORY,
  deleteUploadedAsset,
  writeUploadedAsset,
} from "@/src/infrastructure/local-demo/uploaded-assets";
import { validateUploadedProductSpecificationPdf } from "@/src/infrastructure/documents/product-specification-pdf";
import { normalizeProductNumber } from "@/src/modules/catalog/public/product-identity";
import {
  AssetUploadValidationError,
  type AssetKind,
  validateAssetUpload,
} from "@/src/modules/content-publishing/public/asset-upload";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";

export type AssetReference = {
  current: boolean;
  partNumber: string;
  publicationId?: string;
  usage: "document" | "image";
  version?: number;
};

export class AssetManagementError extends Error {
  constructor(
    readonly code:
      | "ASSET_REFERENCED"
      | "CONFLICT"
      | "FORBIDDEN"
      | "GENERATED_ASSET_PROTECTED"
      | "NOT_FOUND"
      | "PUBLISHED_ASSET_REFERENCED"
      | "UPLOAD_INVALID",
    readonly references: AssetReference[] = [],
    readonly validationCode?: AssetUploadValidationError["code"],
  ) {
    super(code);
    this.name = "AssetManagementError";
  }
}

export type AssetUploadFile = {
  bytes: Uint8Array;
  declaredMimeType: string;
  originalFilename: string;
};

function assertCanManageAssets(actor: AdminActor): void {
  if (
    actor.role !== APP_ROLES.ADMINISTRATOR &&
    actor.role !== APP_ROLES.CONTENT_EDITOR
  ) {
    throw new AssetManagementError("FORBIDDEN");
  }
}

function validatedUpload(
  kind: AssetKind,
  file: AssetUploadFile,
  imageAltEn?: string,
  imageAltZhCn?: string,
) {
  try {
    return validateAssetUpload({
      bytes: file.bytes,
      declaredMimeType: file.declaredMimeType,
      imageAltEn,
      imageAltZhCn,
      kind,
      originalFilename: file.originalFilename,
    });
  } catch (error) {
    if (error instanceof AssetUploadValidationError) {
      throw new AssetManagementError("UPLOAD_INVALID", [], error.code);
    }
    throw error;
  }
}

function prepareUploadedAsset(
  kind: AssetKind,
  file: AssetUploadFile,
  createdByUserId: string,
  imageAltEn?: string,
  imageAltZhCn?: string,
) {
  const validation = validatedUpload(kind, file, imageAltEn, imageAltZhCn);
  const id = randomUUID();

  return {
    data: {
      byteSize: validation.byteSize,
      createdByUserId,
      id,
      imageAltEn: validation.imageAltEn,
      imageAltZhCn: validation.imageAltZhCn,
      kind,
      mimeType: validation.mimeType,
      originalFilename: validation.displayFilename,
      publicPath: `/media/assets/${id}`,
      source: "uploaded" as const,
      storageFilename: `${randomUUID()}${validation.extension}`,
    },
    validation,
  };
}

async function assertValidDocumentStructure(
  kind: AssetKind,
  bytes: Uint8Array,
): Promise<void> {
  if (kind !== "document") {
    return;
  }

  try {
    await validateUploadedProductSpecificationPdf(bytes);
  } catch {
    throw new AssetManagementError("UPLOAD_INVALID", [], "DOCUMENT_INVALID");
  }
}

const assetReferenceInclude = {
  draftDocumentProducts: {
    select: { product: { select: { partNumber: true } } },
  },
  draftImageProducts: {
    select: { product: { select: { partNumber: true } } },
  },
  publicationDocumentProducts: {
    select: {
      id: true,
      product: { select: { currentPublicationId: true, partNumber: true } },
      version: true,
    },
  },
  publicationImageProducts: {
    select: {
      id: true,
      product: { select: { currentPublicationId: true, partNumber: true } },
      version: true,
    },
  },
} as const;

function assetReferences(
  asset: Awaited<
    ReturnType<ApplicationDatabase["asset"]["findUniqueOrThrow"]>
  > & {
    draftDocumentProducts?: Array<{ product: { partNumber: string } }>;
    draftImageProducts?: Array<{ product: { partNumber: string } }>;
    publicationDocumentProducts?: Array<{
      id: string;
      product: { currentPublicationId: string | null; partNumber: string };
      version: number;
    }>;
    publicationImageProducts?: Array<{
      id: string;
      product: { currentPublicationId: string | null; partNumber: string };
      version: number;
    }>;
  },
): AssetReference[] {
  const published: AssetReference[] = [
    ...(asset.publicationImageProducts ?? []).map((publication) => ({
      current: publication.product.currentPublicationId === publication.id,
      partNumber: publication.product.partNumber,
      publicationId: publication.id,
      usage: "image" as const,
      version: publication.version,
    })),
    ...(asset.publicationDocumentProducts ?? []).map((publication) => ({
      current: publication.product.currentPublicationId === publication.id,
      partNumber: publication.product.partNumber,
      publicationId: publication.id,
      usage: "document" as const,
      version: publication.version,
    })),
  ];
  const drafts: AssetReference[] = [
    ...(asset.draftImageProducts ?? []).map(({ product }) => ({
      current: false,
      partNumber: product.partNumber,
      usage: "image" as const,
    })),
    ...(asset.draftDocumentProducts ?? []).map(({ product }) => ({
      current: false,
      partNumber: product.partNumber,
      usage: "document" as const,
    })),
  ];

  return [...published, ...drafts].sort((left, right) =>
    `${left.partNumber}:${left.usage}:${left.version ?? 0}`.localeCompare(
      `${right.partNumber}:${right.usage}:${right.version ?? 0}`,
    ),
  );
}

export async function uploadAsset({
  actor,
  file,
  imageAltEn,
  imageAltZhCn,
  kind,
  now = new Date(),
  prisma = getApplicationPrisma(),
  storageDirectory = DEFAULT_UPLOAD_DIRECTORY,
}: {
  actor: AdminActor;
  file: AssetUploadFile;
  imageAltEn?: string;
  imageAltZhCn?: string;
  kind: AssetKind;
  now?: Date;
  prisma?: ApplicationDatabase;
  storageDirectory?: string;
}) {
  assertCanManageAssets(actor);
  const prepared = prepareUploadedAsset(
    kind,
    file,
    actor.id,
    imageAltEn,
    imageAltZhCn,
  );
  await assertValidDocumentStructure(kind, file.bytes);
  await writeUploadedAsset({
    bytes: file.bytes,
    storageDirectory,
    storageFilename: prepared.data.storageFilename,
  });

  try {
    return await prisma.asset.create({
      data: { ...prepared.data, createdAt: now },
    });
  } catch (error) {
    await deleteUploadedAsset({
      storageDirectory,
      storageFilename: prepared.data.storageFilename,
    });
    throw error;
  }
}

export async function listAssets({
  actor,
  kind,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  kind?: AssetKind;
  prisma?: ApplicationDatabase;
}) {
  assertCanManageAssets(actor);
  const assets = await prisma.asset.findMany({
    include: assetReferenceInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    where: kind ? { kind } : undefined,
  });

  return assets.map((asset) => ({
    ...asset,
    references: assetReferences(asset),
  }));
}

export async function deleteAsset({
  actor,
  assetId,
  prisma = getApplicationPrisma(),
  storageDirectory = DEFAULT_UPLOAD_DIRECTORY,
}: {
  actor: AdminActor;
  assetId: string;
  prisma?: ApplicationDatabase;
  storageDirectory?: string;
}): Promise<{ deletedAssetId: string }> {
  assertCanManageAssets(actor);
  const asset = await prisma.asset.findUnique({
    include: assetReferenceInclude,
    where: { id: assetId },
  });

  if (!asset) {
    throw new AssetManagementError("NOT_FOUND");
  }
  const references = assetReferences(asset);
  const publishedReferences = references.filter(
    ({ publicationId }) => publicationId !== undefined,
  );
  if (publishedReferences.length > 0) {
    throw new AssetManagementError(
      "PUBLISHED_ASSET_REFERENCED",
      publishedReferences,
    );
  }
  if (asset.source === "generated") {
    throw new AssetManagementError("GENERATED_ASSET_PROTECTED");
  }
  if (references.length > 0) {
    throw new AssetManagementError("ASSET_REFERENCED", references);
  }

  await prisma.asset.delete({ where: { id: asset.id } });
  await deleteUploadedAsset({
    storageDirectory,
    storageFilename: asset.storageFilename,
  });

  return { deletedAssetId: asset.id };
}

export async function replaceProductDraftDocument({
  actor,
  expectedDraftVersion,
  file,
  now = new Date(),
  partNumber,
  prisma = getApplicationPrisma(),
  storageDirectory = DEFAULT_UPLOAD_DIRECTORY,
}: {
  actor: AdminActor;
  expectedDraftVersion: number;
  file: AssetUploadFile;
  now?: Date;
  partNumber: string;
  prisma?: ApplicationDatabase;
  storageDirectory?: string;
}) {
  assertCanManageAssets(actor);
  const prepared = prepareUploadedAsset("document", file, actor.id);
  await assertValidDocumentStructure("document", file.bytes);
  await writeUploadedAsset({
    bytes: file.bytes,
    storageDirectory,
    storageFilename: prepared.data.storageFilename,
  });

  try {
    return await prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findUnique({
        select: { draft: { select: { version: true } }, id: true },
        where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
      });
      if (!product?.draft) {
        throw new AssetManagementError("NOT_FOUND");
      }
      if (product.draft.version !== expectedDraftVersion) {
        throw new AssetManagementError("CONFLICT");
      }

      const asset = await transaction.asset.create({
        data: { ...prepared.data, createdAt: now },
      });
      const update = await transaction.productDraft.updateMany({
        data: {
          documentAssetId: asset.id,
          lastModifiedByUserId: actor.id,
          restoredFromPublicationId: null,
          updatedAt: now,
          version: { increment: 1 },
        },
        where: { productId: product.id, version: expectedDraftVersion },
      });
      if (update.count !== 1) {
        throw new AssetManagementError("CONFLICT");
      }
      await transaction.auditLog.create({
        data: {
          actorRole: actor.role,
          actorUserId: actor.id,
          createdAt: now,
          event: "PRODUCT_DOCUMENT_REPLACED",
          outcome: "SUCCESS",
          summary: `资料替换为新素材 ${asset.originalFilename}；仅更新草稿。`,
          targetId: product.id,
          targetType: "PRODUCT",
        },
      });

      return { asset, draftVersion: expectedDraftVersion + 1 };
    });
  } catch (error) {
    await deleteUploadedAsset({
      storageDirectory,
      storageFilename: prepared.data.storageFilename,
    });
    throw error;
  }
}

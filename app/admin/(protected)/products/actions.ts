"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AssetManagementError,
  replaceProductDraftDocument,
} from "@/src/application/asset-management";
import {
  deleteNeverPublishedProductDraft,
  ProductPublishingError,
  publishProductDraft,
  restoreProductPublication,
  saveProductDraft,
  type ProductDraftInput,
} from "@/src/application/product-publishing";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export type ProductMutationState = {
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
  partNumber: z.string().trim().min(1).max(80),
});

const saveSchema = identitySchema.extend({
  categoryId: z.string().trim().min(1).max(100),
  descriptionEn: z.string().max(8_000),
  descriptionZhCn: z.string().max(8_000),
  fitmentSummaryEn: z.string().max(2_000),
  fitmentSummaryZhCn: z.string().max(2_000),
  imageAltEn: z.string().max(300),
  imageAltZhCn: z.string().max(300),
  imageAssetId: z.string().max(100),
  imagePath: z.string().trim().max(500),
  nameEn: z.string().max(200),
  nameZhCn: z.string().max(200),
  references: z.string().max(8_000),
  replacementPartNumber: z.string().max(80),
  seoDescriptionEn: z.string().max(500),
  seoDescriptionZhCn: z.string().max(500),
  seoTitleEn: z.string().max(200),
  seoTitleZhCn: z.string().max(200),
  slugEn: z.string().max(200),
  slugZhCn: z.string().max(200),
  status: z.enum(["published", "discontinued"]),
  summaryEn: z.string().max(2_000),
  summaryZhCn: z.string().max(2_000),
});

function errorState(error: unknown): ProductMutationState {
  if (!(error instanceof ProductPublishingError)) {
    return { message: "操作未完成，请重试。", status: "error" };
  }

  if (error.code === "CONFLICT") {
    return {
      conflict: error.conflict
        ? {
            latestModifiedAt: error.conflict.latestModifiedAt.toISOString(),
            latestModifiedBy: error.conflict.latestModifiedBy,
            latestVersion: error.conflict.latestVersion,
          }
        : undefined,
      message: "草稿已由其他窗口更新，本次保存未覆盖较新内容。",
      status: "error",
    };
  }

  const messages: Partial<Record<ProductPublishingError["code"], string>> = {
    FORBIDDEN: "你没有维护产品内容的权限。",
    HARD_DELETE_FORBIDDEN: "该产品已有发布历史或业务引用，不能永久删除。",
    INVALID_DRAFT: "草稿数据未通过服务端校验。",
    NOTHING_TO_PUBLISH: "当前草稿没有尚未发布的修改。",
    NOT_FOUND: "产品或发布版本不存在。",
    PUBLISH_VALIDATION_FAILED: "产品尚未满足发布条件。",
  };

  return {
    fieldErrors: Object.fromEntries(
      error.fieldErrors.map(({ field, message }) => [field, message]),
    ),
    message: messages[error.code] ?? "操作未完成，请重试。",
    status: "error",
  };
}

async function authorizedActor() {
  const authorization = await authorizeAdminPage(
    PERMISSIONS.PRODUCTS_MANAGE,
    "/admin/products",
  );

  if (!authorization.allowed) {
    throw new ProductPublishingError("FORBIDDEN");
  }

  return authorization.actor;
}

function parseReferences(value: string) {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("|");

      if (separator === -1) {
        throw new ProductPublishingError("INVALID_DRAFT", [
          {
            field: "references",
            message: "每行参考号需使用“品牌 | 号码”格式。",
          },
        ]);
      }

      return {
        brand: line.slice(0, separator).trim(),
        referenceNumber: line.slice(separator + 1).trim(),
      };
    });
}

function parseSpecifications(formData: FormData) {
  const inputs: ProductDraftInput["specifications"] = [];

  for (const [key, rawValue] of formData.entries()) {
    const match = /^specification:([a-z0-9_]+):value$/u.exec(key);
    if (!match || typeof rawValue !== "string") {
      continue;
    }

    const attributeCode = match[1];
    const dataType = formData.get(`specification:${attributeCode}:type`);
    const required =
      formData.get(`specification:${attributeCode}:required`) === "true";
    const unit = formData.get(`specification:${attributeCode}:unit`);

    if (!required && rawValue.trim() === "") {
      continue;
    }

    let value: unknown = rawValue;

    if (dataType === "decimal") {
      value = rawValue.trim() === "" ? Number.NaN : Number(rawValue);
    } else if (dataType === "boolean") {
      value = rawValue === "" ? undefined : rawValue === "true";
    }

    inputs.push({
      attributeCode,
      unit: typeof unit === "string" && unit ? unit : undefined,
      value,
    });
  }

  return inputs;
}

export async function saveProductDraftAction(
  _previousState: ProductMutationState,
  formData: FormData,
): Promise<ProductMutationState> {
  const parsed = saveSchema.safeParse({
    categoryId: formData.get("categoryId"),
    descriptionEn: formData.get("descriptionEn"),
    descriptionZhCn: formData.get("descriptionZhCn"),
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    fitmentSummaryEn: formData.get("fitmentSummaryEn"),
    fitmentSummaryZhCn: formData.get("fitmentSummaryZhCn"),
    imageAltEn: formData.get("imageAltEn"),
    imageAltZhCn: formData.get("imageAltZhCn"),
    imageAssetId: formData.get("imageAssetId"),
    imagePath: formData.get("imagePath"),
    nameEn: formData.get("nameEn"),
    nameZhCn: formData.get("nameZhCn"),
    partNumber: formData.get("partNumber"),
    references: formData.get("references"),
    replacementPartNumber: formData.get("replacementPartNumber"),
    seoDescriptionEn: formData.get("seoDescriptionEn"),
    seoDescriptionZhCn: formData.get("seoDescriptionZhCn"),
    seoTitleEn: formData.get("seoTitleEn"),
    seoTitleZhCn: formData.get("seoTitleZhCn"),
    slugEn: formData.get("slugEn"),
    slugZhCn: formData.get("slugZhCn"),
    status: formData.get("status"),
    summaryEn: formData.get("summaryEn"),
    summaryZhCn: formData.get("summaryZhCn"),
  });

  if (!parsed.success) {
    return {
      message: "表单格式无效，请检查字段长度后重试。",
      status: "error",
    };
  }

  try {
    const actor = await authorizedActor();
    const { expectedDraftVersion, partNumber, references, ...input } =
      parsed.data;
    const saved = await saveProductDraft({
      actor,
      expectedDraftVersion,
      input: {
        ...input,
        imageAssetId: input.imageAssetId.trim() || null,
        references: parseReferences(references),
        replacementPartNumber: input.replacementPartNumber.trim() || null,
        specifications: parseSpecifications(formData),
      },
      partNumber,
    });
    const path = `/admin/products/${encodeURIComponent(partNumber)}`;
    revalidatePath(path);
    revalidatePath("/admin/products");

    return {
      message: "草稿已保存，公开页面仍保持当前发布版本。",
      status: "success",
      version: saved.version,
    };
  } catch (error) {
    return errorState(error);
  }
}

const assetValidationMessages: Record<string, string> = {
  DOCUMENT_INVALID: "PDF 文件结构无效或不包含可读取页面。",
  EMPTY_FILE: "PDF 文件不能为空。",
  EXTENSION_MISMATCH: "资料扩展名必须是 .pdf。",
  FILE_TOO_LARGE: "PDF 资料不能超过 10 MiB。",
  MIME_MISMATCH: "声明 MIME 与 PDF 文件签名不一致。",
  SIGNATURE_MISMATCH: "文件没有有效的 PDF 签名。",
  UNSUPPORTED_MEDIA_TYPE: "产品资料只接受 PDF。",
};

export async function replaceProductDocumentAction(
  _previousState: ProductMutationState,
  formData: FormData,
): Promise<ProductMutationState> {
  const parsed = identitySchema.safeParse({
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    partNumber: formData.get("partNumber"),
  });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File)) {
    return { message: "请选择 PDF 资料后重试。", status: "error" };
  }

  try {
    const actor = await authorizedActor();
    const result = await replaceProductDraftDocument({
      actor,
      expectedDraftVersion: parsed.data.expectedDraftVersion,
      file: {
        bytes: new Uint8Array(await file.arrayBuffer()),
        declaredMimeType: file.type,
        originalFilename: file.name,
      },
      partNumber: parsed.data.partNumber,
    });
    const productPath =
      "/admin/products/" + encodeURIComponent(parsed.data.partNumber);
    revalidatePath(productPath);
    revalidatePath(productPath + "/preview/en");
    revalidatePath(productPath + "/preview/zh-cn");
    return {
      message: `已创建新资料素材 ${result.asset.originalFilename} 并更新草稿；当前公开版本未改变。`,
      status: "success",
      version: result.draftVersion,
    };
  } catch (error) {
    if (error instanceof AssetManagementError) {
      return {
        message:
          (error.validationCode &&
            assetValidationMessages[error.validationCode]) ||
          (error.code === "CONFLICT"
            ? "草稿已由其他窗口更新，请刷新后重试。"
            : error.code === "FORBIDDEN"
              ? "你没有替换产品资料的权限。"
              : "资料替换未完成，请重试。"),
        status: "error",
      };
    }
    return errorState(error);
  }
}

export async function publishProductDraftAction(
  _previousState: ProductMutationState,
  formData: FormData,
): Promise<ProductMutationState> {
  const parsed = identitySchema.safeParse({
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    partNumber: formData.get("partNumber"),
  });

  if (!parsed.success) {
    return { message: "发布请求已失效，请刷新后重试。", status: "error" };
  }

  try {
    const actor = await authorizedActor();
    const published = await publishProductDraft({
      actor,
      expectedDraftVersion: parsed.data.expectedDraftVersion,
      partNumber: parsed.data.partNumber,
    });
    const path = `/admin/products/${encodeURIComponent(parsed.data.partNumber)}`;
    revalidatePath(path);
    revalidatePath("/admin/products");
    revalidatePath("/admin/content");
    revalidatePath("/en/products");
    revalidatePath("/zh-cn/products");

    return {
      message: `已创建不可变公开版本 v${published.version}。`,
      status: "success",
      version: parsed.data.expectedDraftVersion,
    };
  } catch (error) {
    return errorState(error);
  }
}

const restoreSchema = identitySchema.extend({
  publicationId: z.string().trim().min(1).max(200),
});

export async function restoreProductPublicationAction(
  _previousState: ProductMutationState,
  formData: FormData,
): Promise<ProductMutationState> {
  const parsed = restoreSchema.safeParse({
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    partNumber: formData.get("partNumber"),
    publicationId: formData.get("publicationId"),
  });

  if (!parsed.success) {
    return { message: "恢复请求已失效，请刷新后重试。", status: "error" };
  }

  try {
    const actor = await authorizedActor();
    const restored = await restoreProductPublication({
      actor,
      expectedDraftVersion: parsed.data.expectedDraftVersion,
      partNumber: parsed.data.partNumber,
      publicationId: parsed.data.publicationId,
    });
    const path = `/admin/products/${encodeURIComponent(parsed.data.partNumber)}`;
    revalidatePath(path);
    revalidatePath("/admin/products");

    return {
      message: "历史版本已恢复为新草稿；当前公开页面没有改变。",
      status: "success",
      version: restored.version,
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteProductDraftAction(
  _previousState: ProductMutationState,
  formData: FormData,
): Promise<ProductMutationState> {
  const parsed = identitySchema.safeParse({
    expectedDraftVersion: formData.get("expectedDraftVersion"),
    partNumber: formData.get("partNumber"),
  });

  if (!parsed.success) {
    return { message: "删除请求已失效，请刷新后重试。", status: "error" };
  }

  try {
    const actor = await authorizedActor();
    await deleteNeverPublishedProductDraft({
      actor,
      expectedDraftVersion: parsed.data.expectedDraftVersion,
      partNumber: parsed.data.partNumber,
    });
    revalidatePath("/admin/products");

    return { message: "未发布草稿已永久删除。", status: "success" };
  } catch (error) {
    return errorState(error);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  type AssetReference,
  AssetManagementError,
  deleteAsset,
  uploadAsset,
} from "@/src/application/asset-management";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export type AssetMutationState = {
  message: string;
  references?: AssetReference[];
  status: "error" | "idle" | "success";
  validationCode?: string;
};

const initialErrorMessages = {
  ASSET_REFERENCED: "该素材仍被产品草稿引用，请先调整草稿关联。",
  CONFLICT: "产品草稿已更新，请刷新后重新操作。",
  FORBIDDEN: "你没有管理素材的权限。",
  GENERATED_ASSET_PROTECTED: "标准生成素材由演示重置管理，不能手动删除。",
  NOT_FOUND: "素材或产品草稿不存在。",
  PUBLISHED_ASSET_REFERENCED: "该素材已被发布版本引用，不能直接删除。",
  UPLOAD_INVALID: "文件未通过安全校验。",
} satisfies Record<AssetManagementError["code"], string>;

const validationMessages: Record<string, string> = {
  DOCUMENT_INVALID: "PDF 文件结构无效或不包含可读取页面。",
  EMPTY_FILE: "文件不能为空。",
  EXTENSION_MISMATCH: "文件扩展名与实际类型不一致。",
  FILE_TOO_LARGE: "图片不能超过 5 MiB，PDF 不能超过 10 MiB。",
  IMAGE_ALT_REQUIRED: "图片必须填写中英文替代文本。",
  MIME_MISMATCH: "声明 MIME 与文件签名不一致。",
  SIGNATURE_MISMATCH: "文件签名无法识别或不符合声明类型。",
  UNSUPPORTED_MEDIA_TYPE: "图片仅支持 JPEG、PNG、WebP，资料仅支持 PDF。",
};

function errorState(error: unknown): AssetMutationState {
  if (!(error instanceof AssetManagementError)) {
    return { message: "操作未完成，请重试。", status: "error" };
  }

  return {
    message:
      (error.validationCode && validationMessages[error.validationCode]) ||
      initialErrorMessages[error.code],
    references: error.references,
    status: "error",
    validationCode: error.validationCode,
  };
}

async function authorizedActor() {
  const authorization = await authorizeAdminPage(
    PERMISSIONS.CONTENT_MANAGE,
    "/admin/assets",
  );
  if (!authorization.allowed) {
    throw new AssetManagementError("FORBIDDEN");
  }
  return authorization.actor;
}

export async function uploadAssetAction(
  _previousState: AssetMutationState,
  formData: FormData,
): Promise<AssetMutationState> {
  const parsed = z
    .object({
      imageAltEn: z.string().max(300),
      imageAltZhCn: z.string().max(300),
      kind: z.enum(["document", "image"]),
    })
    .safeParse({
      imageAltEn: formData.get("imageAltEn"),
      imageAltZhCn: formData.get("imageAltZhCn"),
      kind: formData.get("kind"),
    });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File)) {
    return { message: "请选择文件并检查表单字段。", status: "error" };
  }

  try {
    const actor = await authorizedActor();
    const asset = await uploadAsset({
      actor,
      file: {
        bytes: new Uint8Array(await file.arrayBuffer()),
        declaredMimeType: file.type,
        originalFilename: file.name,
      },
      imageAltEn: parsed.data.imageAltEn,
      imageAltZhCn: parsed.data.imageAltZhCn,
      kind: parsed.data.kind,
    });
    revalidatePath("/admin/assets");
    return {
      message: `已创建新素材记录：${asset.originalFilename}。`,
      status: "success",
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteAssetAction(
  _previousState: AssetMutationState,
  formData: FormData,
): Promise<AssetMutationState> {
  const parsed = z.string().uuid().safeParse(formData.get("assetId"));
  if (!parsed.success) {
    return { message: "删除请求无效，请刷新后重试。", status: "error" };
  }

  try {
    const actor = await authorizedActor();
    await deleteAsset({ actor, assetId: parsed.data });
    revalidatePath("/admin/assets");
    return { message: "未引用的上传素材已删除。", status: "success" };
  } catch (error) {
    return errorState(error);
  }
}

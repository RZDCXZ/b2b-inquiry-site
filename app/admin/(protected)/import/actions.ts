"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  confirmProductImport,
  previewProductImport,
  ProductImportError,
  rollbackProductImportBatch,
} from "@/src/application/product-import";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export type ProductImportUploadState = {
  message: string;
  status: "error" | "idle";
};

const confirmationSchema = z.object({
  previewId: z.string().uuid(),
});
const rollbackSchema = z.object({
  batchId: z.string().uuid(),
});
const uploadSchema = z.object({
  file: z.instanceof(File).refine((file) => file.size > 0),
});

export async function previewProductImportAction(
  _previousState: ProductImportUploadState,
  formData: FormData,
): Promise<ProductImportUploadState> {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.IMPORTS_MANAGE,
    "/admin/import",
  );
  if (!allowed) {
    return { message: "你没有执行批量导入的权限。", status: "error" };
  }
  const parsed = uploadSchema.safeParse({ file: formData.get("file") });
  if (!parsed.success) {
    return { message: "请选择一个 .xlsx 工作簿。", status: "error" };
  }
  const { file } = parsed.data;

  let previewId: string;
  try {
    const preview = await previewProductImport({
      actor,
      file: {
        bytes: new Uint8Array(await file.arrayBuffer()),
        declaredMimeType: file.type || "application/octet-stream",
        originalFilename: file.name,
      },
    });
    previewId = preview.id;
  } catch (error) {
    return {
      message:
        error instanceof ProductImportError && error.code === "FORBIDDEN"
          ? "你没有执行批量导入的权限。"
          : "工作簿未能上传，请检查文件后重试。",
      status: "error",
    };
  }

  redirect(`/admin/import/previews/${previewId}`);
}

export async function confirmProductImportAction(formData: FormData) {
  const parsed = confirmationSchema.safeParse({
    previewId: formData.get("previewId"),
  });
  if (!parsed.success) redirect("/admin/import");

  const previewPath = `/admin/import/previews/${parsed.data.previewId}`;
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.IMPORTS_MANAGE,
    previewPath,
  );
  if (!allowed) redirect(`${previewPath}?notice=forbidden`);

  let batchId: string | undefined;
  let notice: string | undefined;
  try {
    const batch = await confirmProductImport({
      actor,
      previewId: parsed.data.previewId,
    });
    batchId = batch.id;
  } catch (error) {
    notice =
      error instanceof ProductImportError
        ? error.code.toLocaleLowerCase().replaceAll("_", "-")
        : "transaction-failed";
  }

  if (!batchId) redirect(`${previewPath}?notice=${notice}`);
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath(previewPath);
  redirect(`/admin/import/batches/${batchId}`);
}

export async function rollbackProductImportBatchAction(formData: FormData) {
  const parsed = rollbackSchema.safeParse({ batchId: formData.get("batchId") });
  if (!parsed.success) redirect("/admin/import");

  const batchPath = `/admin/import/batches/${parsed.data.batchId}`;
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.IMPORTS_MANAGE,
    batchPath,
  );
  if (!allowed) redirect(`${batchPath}?notice=forbidden`);

  let notice = "rolled-back";
  try {
    await rollbackProductImportBatch({
      actor,
      batchId: parsed.data.batchId,
    });
  } catch (error) {
    notice =
      error instanceof ProductImportError
        ? error.code.toLocaleLowerCase().replaceAll("_", "-")
        : "transaction-failed";
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath(batchPath);
  redirect(`${batchPath}?notice=${notice}`);
}

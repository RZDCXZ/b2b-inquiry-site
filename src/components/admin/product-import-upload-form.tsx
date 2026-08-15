"use client";

import { FileArrowUp, Warning } from "@phosphor-icons/react";
import { useActionState } from "react";

import {
  previewProductImportAction,
  type ProductImportUploadState,
} from "@/app/admin/(protected)/import/actions";

const initialState: ProductImportUploadState = { message: "", status: "idle" };

export function ProductImportUploadForm() {
  const [state, formAction, pending] = useActionState(
    previewProductImportAction,
    initialState,
  );

  return (
    <form action={formAction} className="product-import-upload-form">
      <FileArrowUp aria-hidden="true" size={52} weight="thin" />
      <div>
        <h2>选择 Excel 工作簿</h2>
        <p>
          仅支持基于当前模板的 .xlsx 文件，最大 5
          MiB。系统会先收集全部错误，不会立即修改数据。
        </p>
      </div>
      {state.status === "error" ? (
        <p className="product-import-form-error" role="alert">
          <Warning aria-hidden="true" /> {state.message}
        </p>
      ) : null}
      <label>
        <span>工作簿文件</span>
        <input
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          name="file"
          required
          type="file"
        />
      </label>
      <button className="admin-primary-button" disabled={pending} type="submit">
        <FileArrowUp aria-hidden="true" />
        {pending ? "正在上传并校验…" : "上传并校验"}
      </button>
    </form>
  );
}

"use client";

import { FileArrowUp, Warning } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef } from "react";

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
  const errorRef = useRef<HTMLParagraphElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

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
        <p
          className="product-import-form-error"
          id="product-import-upload-error"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          <Warning aria-hidden="true" />
          <span>{state.message}</span>
          <a
            href="#product-import-file"
            onClick={(event) => {
              event.preventDefault();
              fileInputRef.current?.focus();
            }}
          >
            检查文件字段
          </a>
        </p>
      ) : null}
      <label>
        <span>工作簿文件</span>
        <input
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-describedby={
            state.status === "error" ? "product-import-upload-error" : undefined
          }
          id="product-import-file"
          name="file"
          ref={fileInputRef}
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

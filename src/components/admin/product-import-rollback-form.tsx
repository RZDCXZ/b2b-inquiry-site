"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useRef } from "react";

import { rollbackProductImportBatchAction } from "@/app/admin/(protected)/import/actions";

export function ProductImportRollbackForm({ batchId }: { batchId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        className="admin-danger-button"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <ArrowCounterClockwise aria-hidden="true" /> 整批撤销
      </button>
      <dialog className="admin-confirm-dialog" ref={dialogRef}>
        <div className="admin-confirm-dialog-card">
          <header>
            <div>
              <span>高影响操作</span>
              <h2>确认整批撤销？</h2>
            </div>
            <button
              aria-label="关闭撤销确认"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </header>
          <p>
            系统会在一个事务中恢复导入前已有草稿，并移除本批次新增且没有业务历史的产品。工作簿未出现的产品和所有公开版本都不会改变。
          </p>
          <div className="admin-confirm-dialog-actions">
            <button
              className="admin-secondary-button"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              取消
            </button>
            <form action={rollbackProductImportBatchAction}>
              <input name="batchId" type="hidden" value={batchId} />
              <button className="admin-danger-button" type="submit">
                确认整批撤销
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

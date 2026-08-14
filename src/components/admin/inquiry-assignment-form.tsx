"use client";

import { Check, UsersThree, X } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  assignInquiryAction,
  type InquiryAssignmentActionState,
} from "@/app/admin/(protected)/inquiries/actions";

const initialAssignmentState: InquiryAssignmentActionState = {
  message: "",
  status: "idle",
};

export function InquiryAssignmentForm({
  currentOwnerId,
  owners,
  referenceNumber,
  version,
}: {
  currentOwnerId: string | null;
  owners: Array<{ id: string; name: string }>;
  referenceNumber: string;
  version: number;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const ownerSelectRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, pending] = useActionState(
    assignInquiryAction,
    initialAssignmentState,
  );
  const reassigning = currentOwnerId !== null;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (open && dialog && !dialog.open) {
      dialog.showModal();
      ownerSelectRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open && state.status === "error") {
      errorSummaryRef.current?.focus();
    }
  }, [open, state]);

  function closeDrawer() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        className="admin-secondary-button"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <UsersThree aria-hidden="true" size={18} />
        {reassigning ? "重新分配" : "分配询盘"}
      </button>
      <dialog
        aria-labelledby="assignment-title"
        className="admin-drawer-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDrawer();
          }
        }}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        ref={dialogRef}
      >
        <section className="admin-drawer">
          <header>
            <div>
              <p>询盘 {referenceNumber}</p>
              <h2 id="assignment-title">
                {reassigning ? "重新分配当前负责人" : "分配当前负责人"}
              </h2>
              <span>
                保存会立即切换完整联系方式与内部区域的访问权，并保留历史。
              </span>
            </div>
            <button
              aria-label="关闭分配面板"
              onClick={closeDrawer}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </header>
          {state.message ? (
            <div
              className={`admin-action-message is-${state.status}`}
              ref={state.status === "error" ? errorSummaryRef : undefined}
              role={state.status === "error" ? "alert" : "status"}
              tabIndex={state.status === "error" ? -1 : undefined}
            >
              {state.status === "success" ? <Check aria-hidden="true" /> : null}
              <div>
                <strong>
                  {state.conflict
                    ? "分配冲突"
                    : state.status === "success"
                      ? "分配已保存"
                      : "无法保存分配"}
                </strong>
                <p>{state.message}</p>
                {state.conflict ? (
                  <small>
                    最新修改人：{state.conflict.latestModifiedBy}；时间：
                    {new Date(state.conflict.latestModifiedAt).toLocaleString(
                      "zh-CN",
                      { timeZone: "Asia/Shanghai" },
                    )}
                    ；版本：{state.conflict.latestVersion}
                  </small>
                ) : null}
              </div>
            </div>
          ) : null}
          <form action={formAction} className="admin-assignment-form">
            <input name="expectedVersion" type="hidden" value={version} />
            <input
              name="referenceNumber"
              type="hidden"
              value={referenceNumber}
            />
            <label>
              <span>业务人员</span>
              <select
                defaultValue=""
                name="newOwnerId"
                ref={ownerSelectRef}
                required
              >
                <option disabled value="">
                  选择新的当前负责人
                </option>
                {owners.map((owner) => (
                  <option
                    disabled={owner.id === currentOwnerId}
                    key={owner.id}
                    value={owner.id}
                  >
                    {owner.name}
                    {owner.id === currentOwnerId ? "（当前负责人）" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{reassigning ? "重新分配原因" : "分配原因"}</span>
              <textarea
                maxLength={500}
                minLength={2}
                name="reason"
                placeholder={
                  reassigning
                    ? "例如：原负责人休假，转交当日值班人员"
                    : "例如：按目标市场与区域分配"
                }
                required
                rows={5}
              />
            </label>
            <footer>
              <button
                className="admin-secondary-button"
                onClick={closeDrawer}
                type="button"
              >
                取消
              </button>
              <button
                className="admin-primary-button"
                disabled={pending}
                type="submit"
              >
                {pending
                  ? "正在保存…"
                  : reassigning
                    ? "确认重新分配"
                    : "确认分配"}
              </button>
            </footer>
          </form>
        </section>
      </dialog>
    </>
  );
}

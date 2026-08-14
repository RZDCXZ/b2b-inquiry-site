"use client";

import {
  ArrowCounterClockwise,
  Check,
  NotePencil,
  PaperPlaneTilt,
  PencilSimpleLine,
  Quotes,
  X,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  mutateInquiryLifecycleAction,
  type InquiryLifecycleActionState,
} from "@/app/admin/(protected)/inquiries/actions";
import type { AppRole } from "@/src/modules/identity-access/public/permissions";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import type { InquiryStatus } from "@/src/modules/inquiry-operations/public/inquiry-lifecycle";

type LifecycleOperation =
  "close" | "contact" | "correction" | "internal_note" | "quote" | "reopen";

type ActionDefinition = {
  description: string;
  Icon: Icon;
  label: string;
  title: string;
};

const actionDefinitions: Record<LifecycleOperation, ActionDefinition> = {
  close: {
    description: "必须选择成交、未成交或无效",
    Icon: Check,
    label: "关闭询盘",
    title: "关闭询盘",
  },
  contact: {
    description: "首次联系会自动推进到跟进中",
    Icon: PaperPlaneTilt,
    label: "追加联系记录",
    title: "追加联系记录",
  },
  correction: {
    description: "说明既有记录错误，不覆盖原记录",
    Icon: PencilSimpleLine,
    label: "追加更正记录",
    title: "追加更正记录",
  },
  internal_note: {
    description: "仅管理员与当前负责人可见",
    Icon: NotePencil,
    label: "追加内部备注",
    title: "追加内部备注",
  },
  quote: {
    description: "保存金额、币种、有效期与下一步",
    Icon: Quotes,
    label: "追加报价记录",
    title: "追加报价记录",
  },
  reopen: {
    description: "回到已分配并保留全部历史",
    Icon: ArrowCounterClockwise,
    label: "重新打开询盘",
    title: "重新打开询盘",
  },
};

const initialState: InquiryLifecycleActionState = {
  message: "",
  status: "idle",
};

export function InquiryLifecycleActions({
  actorRole,
  correctableRecords,
  referenceNumber,
  status,
  version,
}: {
  actorRole: AppRole;
  correctableRecords: Array<{ id: string; label: string }>;
  referenceNumber: string;
  status: InquiryStatus;
  version: number;
}) {
  const [operation, setOperation] = useState<LifecycleOperation | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [state, formAction, pending] = useActionState(
    mutateInquiryLifecycleAction,
    initialState,
  );
  const canFollowUp =
    actorRole === APP_ROLES.SALES &&
    (status === "assigned" || status === "in_progress" || status === "quoted");
  const canReopen =
    actorRole === APP_ROLES.ADMINISTRATOR && status === "closed";

  useEffect(() => {
    const dialog = dialogRef.current;

    if (operation && dialog && !dialog.open) {
      dialog.showModal();
      formRef.current
        ?.querySelector<HTMLElement>(
          "input:not([type=hidden]), select, textarea",
        )
        ?.focus();
    }
  }, [operation]);

  useEffect(() => {
    if (operation && state.status === "error") {
      errorSummaryRef.current?.focus();
    }

    if (operation && state.status === "success") {
      dialogRef.current?.close();
    }
  }, [operation, state]);

  function openDrawer(
    nextOperation: LifecycleOperation,
    trigger: HTMLButtonElement,
  ) {
    triggerRef.current = trigger;
    setOperation(nextOperation);
  }

  function closeDrawer() {
    dialogRef.current?.close();
  }

  if (!canFollowUp && !canReopen) {
    return null;
  }

  const definition = operation ? actionDefinitions[operation] : null;

  return (
    <>
      <aside className="admin-section inquiry-lifecycle-actions">
        <p>{canReopen ? "管理员操作" : "追加不可变记录"}</p>
        <h2>{canReopen ? "已关闭询盘" : "下一步动作"}</h2>
        {canFollowUp ? (
          <>
            {(["contact", "quote", "internal_note"] as const).map(
              (nextOperation) => {
                const action = actionDefinitions[nextOperation];
                const Icon = action.Icon;

                return (
                  <button
                    key={nextOperation}
                    onClick={(event) =>
                      openDrawer(nextOperation, event.currentTarget)
                    }
                    type="button"
                  >
                    <Icon aria-hidden="true" size={20} />
                    <span>
                      <strong>{action.label}</strong>
                      <small>{action.description}</small>
                    </span>
                  </button>
                );
              },
            )}
            {correctableRecords.length > 0 ? (
              <button
                onClick={(event) =>
                  openDrawer("correction", event.currentTarget)
                }
                type="button"
              >
                <PencilSimpleLine aria-hidden="true" size={20} />
                <span>
                  <strong>追加更正记录</strong>
                  <small>原记录保持只读</small>
                </span>
              </button>
            ) : null}
            <button
              className="is-danger"
              onClick={(event) => openDrawer("close", event.currentTarget)}
              type="button"
            >
              <Check aria-hidden="true" size={20} />
              <span>
                <strong>关闭询盘</strong>
                <small>必须保存关闭结果</small>
              </span>
            </button>
          </>
        ) : (
          <button
            onClick={(event) => openDrawer("reopen", event.currentTarget)}
            type="button"
          >
            <ArrowCounterClockwise aria-hidden="true" size={20} />
            <span>
              <strong>重新打开询盘</strong>
              <small>回到已分配并保留全部历史</small>
            </span>
          </button>
        )}
      </aside>

      <dialog
        aria-labelledby="lifecycle-action-title"
        className="admin-drawer-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDrawer();
          }
        }}
        onClose={() => {
          setOperation(null);
          triggerRef.current?.focus();
        }}
        ref={dialogRef}
      >
        {operation && definition ? (
          <section className="admin-drawer">
            <header>
              <div>
                <p>询盘 {referenceNumber}</p>
                <h2 id="lifecycle-action-title">{definition.title}</h2>
                <span>
                  {definition.description}；保存后历史不可编辑或删除。
                </span>
              </div>
              <button
                aria-label="关闭操作面板"
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
                <div>
                  <strong>
                    {state.conflict ? "保存冲突" : "无法保存本次操作"}
                  </strong>
                  <p>{state.message}</p>
                  {state.conflict ? (
                    <small>
                      最新修改人：{state.conflict.latestModifiedBy}；时间：
                      {new Date(state.conflict.latestModifiedAt).toLocaleString(
                        "zh-CN",
                        {
                          timeZone: "Asia/Shanghai",
                        },
                      )}
                      ；版本：{state.conflict.latestVersion}
                    </small>
                  ) : null}
                </div>
              </div>
            ) : null}
            <form
              action={formAction}
              className="admin-assignment-form inquiry-lifecycle-form"
              ref={formRef}
            >
              <input name="expectedVersion" type="hidden" value={version} />
              <input name="operation" type="hidden" value={operation} />
              <input
                name="referenceNumber"
                type="hidden"
                value={referenceNumber}
              />

              {operation === "quote" ? (
                <>
                  <div className="inquiry-form-pair">
                    <label>
                      <span>报价金额</span>
                      <input
                        inputMode="decimal"
                        max="9999999999999999.99"
                        min="0.01"
                        name="quoteAmount"
                        placeholder="2880.00"
                        required
                        step="0.01"
                        type="number"
                      />
                    </label>
                    <label>
                      <span>币种</span>
                      <select defaultValue="USD" name="quoteCurrency">
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="CNY">CNY</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    <span>有效期</span>
                    <input name="quoteValidUntil" required type="date" />
                  </label>
                </>
              ) : null}

              {operation === "correction" ? (
                <label>
                  <span>需要更正的记录</span>
                  <select defaultValue="" name="correctionOfId" required>
                    <option disabled value="">
                      选择一条既有记录
                    </option>
                    {correctableRecords.map((record) => (
                      <option key={record.id} value={record.id}>
                        {record.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {operation === "close" ? (
                <fieldset className="inquiry-close-results">
                  <legend>关闭结果</legend>
                  <label>
                    <input
                      name="closeResult"
                      required
                      type="radio"
                      value="won"
                    />
                    成交
                  </label>
                  <label>
                    <input
                      name="closeResult"
                      required
                      type="radio"
                      value="lost"
                    />
                    未成交
                  </label>
                  <label>
                    <input
                      name="closeResult"
                      required
                      type="radio"
                      value="invalid"
                    />
                    无效
                  </label>
                </fieldset>
              ) : null}

              {operation === "close" || operation === "reopen" ? (
                <label>
                  <span>
                    {operation === "close" ? "关闭说明" : "重开说明"}（选填）
                  </span>
                  <textarea
                    maxLength={1_000}
                    minLength={2}
                    name="reason"
                    placeholder="记录本次状态变更的业务原因"
                    rows={5}
                  />
                </label>
              ) : (
                <>
                  <label>
                    <span>摘要</span>
                    <textarea
                      maxLength={2_000}
                      minLength={2}
                      name="summary"
                      placeholder="记录已经发生的事实，不要覆盖既有历史"
                      required
                      rows={5}
                    />
                  </label>
                  <label>
                    <span>下一步日期（选填）</span>
                    <input name="nextStepDate" type="date" />
                  </label>
                </>
              )}

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
                  {pending ? "正在保存…" : definition.label}
                </button>
              </footer>
            </form>
          </section>
        ) : null}
      </dialog>
    </>
  );
}

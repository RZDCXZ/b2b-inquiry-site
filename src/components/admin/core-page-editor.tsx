"use client";

import {
  Archive,
  ArrowCounterClockwise,
  CheckCircle,
  FloppyDisk,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { useActionState } from "react";

import {
  archiveCorePageAction,
  publishCorePageAction,
  restoreCorePageAction,
  saveCorePageAction,
  type ContentMutationState,
} from "@/app/admin/(protected)/content/actions";
import type { CorePageTranslation } from "@/src/modules/content-publishing/public/core-page-contracts";

const initialState: ContentMutationState = { message: "", status: "idle" };

function Feedback({ state }: { state: ContentMutationState }) {
  if (state.status === "idle") return null;
  return (
    <div
      className={`content-feedback is-${state.status}`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.status === "success" ? (
        <CheckCircle weight="fill" />
      ) : (
        <XCircle weight="fill" />
      )}
      <div>
        <strong>{state.message}</strong>
        {state.conflict ? (
          <p>
            最新修改：{state.conflict.latestModifiedBy} ·{" "}
            {new Date(state.conflict.latestModifiedAt).toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            })}
          </p>
        ) : null}
        {state.fieldErrors ? (
          <ul>
            {Object.entries(state.fieldErrors).map(([field, message]) => (
              <li key={field}>
                {field}：{message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function LanguageFields({
  content,
  prefix,
  title,
}: {
  content: CorePageTranslation;
  prefix: "en" | "zhCn";
  title: string;
}) {
  return (
    <fieldset className="core-page-language">
      <legend>{title}</legend>
      <label>
        <span>眉题</span>
        <input defaultValue={content.eyebrow} name={`${prefix}:eyebrow`} />
      </label>
      <label>
        <span>主标题</span>
        <input defaultValue={content.title} name={`${prefix}:title`} />
      </label>
      <label>
        <span>导语</span>
        <textarea
          defaultValue={content.lede}
          name={`${prefix}:lede`}
          rows={4}
        />
      </label>
      {content.sections.map((section, index) => (
        <section key={section.id}>
          <p>
            {String(index + 1).padStart(2, "0")} / {section.id}
          </p>
          <label>
            <span>版块标题</span>
            <input
              defaultValue={section.heading}
              name={`${prefix}:section:${section.id}:heading`}
            />
          </label>
          <label>
            <span>版块正文</span>
            <textarea
              defaultValue={section.body}
              name={`${prefix}:section:${section.id}:body`}
              rows={5}
            />
          </label>
        </section>
      ))}
    </fieldset>
  );
}

function RestoreButton({
  currentVersion,
  keyValue,
  publicationId,
}: {
  currentVersion: number;
  keyValue: string;
  publicationId: string;
}) {
  const [state, action, pending] = useActionState(
    restoreCorePageAction,
    initialState,
  );
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "恢复只会创建新草稿，当前公开页面不会立即改变。继续吗？",
          )
        )
          event.preventDefault();
      }}
    >
      <input
        name="expectedDraftVersion"
        type="hidden"
        value={state.version ?? currentVersion}
      />
      <input name="key" type="hidden" value={keyValue} />
      <input name="publicationId" type="hidden" value={publicationId} />
      <button className="admin-secondary-button" disabled={pending}>
        <ArrowCounterClockwise />
        恢复为新草稿
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function CorePageEditor({
  draft,
  publications,
}: {
  draft: {
    contentEn: CorePageTranslation;
    contentZhCn: CorePageTranslation;
    key: string;
    label: string;
    lastModifiedAt: string;
    lastModifiedBy: string;
    lastPublishedVersion: number | null;
    status: "archived" | "published";
    version: number;
  };
  publications: Array<{
    current: boolean;
    id: string;
    publishedAt: string;
    publishedBy: string;
    restored: boolean;
    status: "archived" | "published";
    version: number;
  }>;
}) {
  const [saveState, saveAction, saving] = useActionState(
    saveCorePageAction,
    initialState,
  );
  const [publishState, publishAction, publishing] = useActionState(
    publishCorePageAction,
    initialState,
  );
  const [archiveState, archiveAction, archiving] = useActionState(
    archiveCorePageAction,
    initialState,
  );
  const currentVersion = Math.max(
    draft.version,
    saveState.version ?? 0,
    publishState.version ?? 0,
    archiveState.version ?? 0,
  );
  return (
    <>
      <div className="content-editor-heading">
        <div>
          <p>内容发布 / 核心页面</p>
          <h1>{draft.label}</h1>
          <span>
            草稿 v{currentVersion} ·{" "}
            {draft.status === "archived" ? "已归档" : "可发布"}
          </span>
        </div>
        <div>
          <form action={publishAction}>
            <input
              name="expectedDraftVersion"
              type="hidden"
              value={currentVersion}
            />
            <input name="key" type="hidden" value={draft.key} />
            <button
              className="admin-primary-button"
              disabled={
                publishing || draft.lastPublishedVersion === currentVersion
              }
            >
              {publishing ? "发布中…" : "同时发布中英文"}
            </button>
          </form>
          <form
            action={archiveAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "归档后两种语言的前台页面都会隐藏，历史仍保留。继续吗？",
                )
              )
                event.preventDefault();
            }}
          >
            <input
              name="expectedDraftVersion"
              type="hidden"
              value={currentVersion}
            />
            <input name="key" type="hidden" value={draft.key} />
            <button
              className="admin-danger-button"
              disabled={archiving || draft.status === "archived"}
            >
              <Archive />
              归档页面
            </button>
          </form>
        </div>
      </div>
      <Feedback state={publishState} />
      <Feedback state={archiveState} />
      {draft.status === "archived" ? (
        <aside className="content-boundary-warning">
          <Warning weight="fill" />
          <p>
            页面当前已从前台隐藏。恢复一个“已发布”历史版本为草稿并重新发布，才能重新公开。
          </p>
        </aside>
      ) : null}
      <form action={saveAction} className="core-page-editor admin-section">
        <input
          name="expectedDraftVersion"
          type="hidden"
          value={currentVersion}
        />
        <input name="key" type="hidden" value={draft.key} />
        <LanguageFields
          content={draft.contentZhCn}
          prefix="zhCn"
          title="简体中文（必须完整）"
        />
        <LanguageFields
          content={draft.contentEn}
          prefix="en"
          title="English（必须完整）"
        />
        <Feedback state={saveState} />
        <footer>
          <span>
            最后保存：{draft.lastModifiedBy} ·{" "}
            {new Date(draft.lastModifiedAt).toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            })}
          </span>
          <button className="admin-primary-button" disabled={saving}>
            <FloppyDisk />
            {saving ? "保存中…" : "保存双语草稿"}
          </button>
        </footer>
      </form>
      <section className="admin-section content-publication-history">
        <header>
          <div>
            <p>不可变发布版本</p>
            <h2>发布历史</h2>
          </div>
          <span>恢复只创建草稿，重新发布后才改变前台。</span>
        </header>
        {publications.map((publication) => (
          <article key={publication.id}>
            <strong>v{publication.version}</strong>
            <span>
              <b>
                {publication.current ? "当前公开指针" : "历史版本"} ·{" "}
                {publication.status === "archived" ? "归档" : "已发布"}
              </b>
              <small>
                {publication.publishedBy} ·{" "}
                {new Date(publication.publishedAt).toLocaleString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                })}
                {publication.restored ? " · 来自恢复草稿" : ""}
              </small>
            </span>
            <RestoreButton
              currentVersion={currentVersion}
              keyValue={draft.key}
              publicationId={publication.id}
            />
          </article>
        ))}
      </section>
    </>
  );
}

"use client";

import {
  Archive,
  ArrowCounterClockwise,
  CheckCircle,
  FloppyDisk,
  XCircle,
} from "@phosphor-icons/react";
import { useActionState } from "react";

import {
  archiveArticleAction,
  publishArticleAction,
  restoreArticleAction,
  saveArticleAction,
  type ContentMutationState,
} from "@/app/admin/(protected)/content/actions";

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

function RestoreButton({
  articleId,
  currentVersion,
  locale,
  publicationId,
}: {
  articleId: string;
  currentVersion: number;
  locale: "en" | "zh-cn";
  publicationId: string;
}) {
  const [state, action, pending] = useActionState(
    restoreArticleAction,
    initialState,
  );
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "恢复只会创建新草稿，当前公开文章不会立即改变。继续吗？",
          )
        )
          event.preventDefault();
      }}
    >
      <input name="articleId" type="hidden" value={articleId} />
      <input
        name="expectedDraftVersion"
        type="hidden"
        value={state.version ?? currentVersion}
      />
      <input name="locale" type="hidden" value={locale} />
      <input name="publicationId" type="hidden" value={publicationId} />
      <button className="admin-secondary-button" disabled={pending}>
        <ArrowCounterClockwise />
        恢复为新草稿
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function ArticleEditor({
  draft,
  publications,
}: {
  draft: {
    articleId: string;
    body: string;
    excerpt: string;
    lastModifiedAt: string;
    lastModifiedBy: string;
    lastPublishedVersion: number | null;
    locale: "en" | "zh-cn";
    seoDescription: string;
    seoTitle: string;
    slug: string;
    status: "archived" | "published";
    title: string;
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
    saveArticleAction,
    initialState,
  );
  const [publishState, publishAction, publishing] = useActionState(
    publishArticleAction,
    initialState,
  );
  const [archiveState, archiveAction, archiving] = useActionState(
    archiveArticleAction,
    initialState,
  );
  const currentVersion = Math.max(
    draft.version,
    saveState.version ?? 0,
    publishState.version ?? 0,
    archiveState.version ?? 0,
  );
  const identity = (
    <>
      <input name="articleId" type="hidden" value={draft.articleId} />
      <input name="expectedDraftVersion" type="hidden" value={currentVersion} />
      <input name="locale" type="hidden" value={draft.locale} />
    </>
  );
  return (
    <>
      <div className="content-editor-heading">
        <div>
          <p>
            内容发布 / 文章 / {draft.locale === "en" ? "English" : "简体中文"}
          </p>
          <h1>{draft.title}</h1>
          <span>草稿 v{currentVersion} · 语言版本独立发布</span>
        </div>
        <div>
          <form action={publishAction}>
            {identity}
            <button
              className="admin-primary-button"
              disabled={
                publishing || draft.lastPublishedVersion === currentVersion
              }
            >
              {publishing ? "发布中…" : "发布当前语言"}
            </button>
          </form>
          <form
            action={archiveAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "归档后当前语言文章会从前台隐藏，历史仍保留。继续吗？",
                )
              )
                event.preventDefault();
            }}
          >
            {identity}
            <button
              className="admin-danger-button"
              disabled={archiving || draft.status === "archived"}
            >
              <Archive />
              归档当前语言
            </button>
          </form>
        </div>
      </div>
      <Feedback state={publishState} />
      <Feedback state={archiveState} />
      <form action={saveAction} className="article-editor admin-section">
        {identity}
        <div className="article-editor-fields">
          <label>
            <span>标题</span>
            <input defaultValue={draft.title} name="title" />
          </label>
          <label>
            <span>URL slug</span>
            <input defaultValue={draft.slug} name="slug" />
          </label>
          <label className="is-wide">
            <span>摘要</span>
            <textarea defaultValue={draft.excerpt} name="excerpt" rows={3} />
          </label>
          <label>
            <span>SEO 标题</span>
            <input defaultValue={draft.seoTitle} name="seoTitle" />
          </label>
          <label>
            <span>SEO 描述</span>
            <textarea
              defaultValue={draft.seoDescription}
              name="seoDescription"
              rows={3}
            />
          </label>
          <label className="is-wide">
            <span>受限富文本</span>
            <small>
              仅支持 ##/###
              标题、段落、列表、链接、本站图片、**强调**；HTML、脚本、iframe、内嵌样式会被服务端拒绝。
            </small>
            <div className="rich-text-toolbar" aria-label="允许的富文本格式">
              <b>H2</b>
              <b>H3</b>
              <b>• List</b>
              <b>Link</b>
              <b>Image</b>
              <b>Emphasis</b>
            </div>
            <textarea defaultValue={draft.body} name="body" rows={18} />
          </label>
        </div>
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
            {saving ? "保存中…" : "保存文章草稿"}
          </button>
        </footer>
      </form>
      <section className="admin-section content-publication-history">
        <header>
          <div>
            <p>当前语言</p>
            <h2>不可变发布历史</h2>
          </div>
          <span>恢复后必须再次预览和发布才会改变前台。</span>
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
              articleId={draft.articleId}
              currentVersion={currentVersion}
              locale={draft.locale}
              publicationId={publication.id}
            />
          </article>
        ))}
      </section>
    </>
  );
}

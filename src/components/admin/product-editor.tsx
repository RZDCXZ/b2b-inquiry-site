"use client";

import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  CheckCircle,
  FloppyDisk,
  Trash,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  deleteProductDraftAction,
  publishProductDraftAction,
  restoreProductPublicationAction,
  saveProductDraftAction,
  type ProductMutationState,
} from "@/app/admin/(protected)/products/actions";

const initialProductMutationState: ProductMutationState = {
  message: "",
  status: "idle",
};

type SpecificationEditorValue = {
  baseUnit: string | null;
  booleanValue: boolean | null;
  code: string;
  complete: boolean;
  dataType: "boolean" | "decimal" | "enumeration" | "text";
  decimalValue: number | null;
  enumerationValue: string | null;
  label: string;
  options: Array<{ code: string; label: string }>;
  required: boolean;
  textValue: string | null;
};

const productFieldLabels: Record<string, string> = {
  descriptionEn: "English / 完整描述",
  descriptionZhCn: "简体中文 / 完整描述",
  fitmentSummaryEn: "English / 适配摘要",
  fitmentSummaryZhCn: "简体中文 / 适配摘要",
  imageAltEn: "English / 图片替代文本",
  imageAltZhCn: "简体中文 / 图片替代文本",
  imagePath: "图片与资料 / 产品图片路径",
  nameEn: "English / 产品名称",
  nameZhCn: "简体中文 / 产品名称",
  references: "参考号",
  seoDescriptionEn: "English / SEO 描述",
  seoDescriptionZhCn: "简体中文 / SEO 描述",
  seoTitleEn: "English / SEO 标题",
  seoTitleZhCn: "简体中文 / SEO 标题",
  slugEn: "English / 地址片段",
  slugZhCn: "简体中文 / 地址片段",
  specifications: "分类规格",
  summaryEn: "English / 短描述",
  summaryZhCn: "简体中文 / 短描述",
};

export type ProductEditorDraftView = {
  categoryId: string;
  categoryName: string;
  currentPublicationId: string | null;
  descriptionEn: string;
  descriptionZhCn: string;
  fitmentCount: number;
  fitmentSummaryEn: string;
  fitmentSummaryZhCn: string;
  imageAltEn: string;
  imageAltZhCn: string;
  imagePath: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  lastPublishedVersion: number | null;
  nameEn: string;
  nameZhCn: string;
  partNumber: string;
  productStatus: "discontinued" | "draft" | "published";
  publications: Array<{
    current: boolean;
    id: string;
    publishedAt: string;
    publishedBy: string;
    restored: boolean;
    version: number;
  }>;
  references: Array<{ brand: string; referenceNumber: string }>;
  replacementPartNumber: string | null;
  seoDescriptionEn: string;
  seoDescriptionZhCn: string;
  seoTitleEn: string;
  seoTitleZhCn: string;
  slugEn: string;
  slugZhCn: string;
  specifications: SpecificationEditorValue[];
  status: "discontinued" | "published";
  summaryEn: string;
  summaryZhCn: string;
  version: number;
};

function MutationFeedback({
  onFieldNavigate,
  state,
}: {
  onFieldNavigate?: (field: string) => void;
  state: ProductMutationState;
}) {
  if (state.status === "idle") {
    return null;
  }

  return (
    <div
      className={"product-mutation-feedback is-" + state.status}
      role={state.status === "error" ? "alert" : "status"}
      tabIndex={state.status === "error" ? -1 : undefined}
    >
      {state.status === "success" ? (
        <CheckCircle aria-hidden="true" weight="fill" />
      ) : (
        <XCircle aria-hidden="true" weight="fill" />
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
        {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 ? (
          <ul>
            {Object.entries(state.fieldErrors).map(([field, message]) => (
              <li key={field}>
                <a href={"#" + field} onClick={() => onFieldNavigate?.(field)}>
                  {productFieldLabels[field] ?? field}：{message}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function PublishControls({
  draft,
  onFieldNavigate,
}: {
  draft: ProductEditorDraftView;
  onFieldNavigate: (field: string) => void;
}) {
  const [state, action, pending] = useActionState(
    publishProductDraftAction,
    initialProductMutationState,
  );

  return (
    <div className="product-editor-heading-actions">
      <Link
        className="admin-secondary-button"
        href={
          "/admin/products/" +
          encodeURIComponent(draft.partNumber) +
          "/preview/en"
        }
        target="_blank"
      >
        <ArrowSquareOut aria-hidden="true" /> 英文预览
      </Link>
      <Link
        className="admin-secondary-button"
        href={
          "/admin/products/" +
          encodeURIComponent(draft.partNumber) +
          "/preview/zh-cn"
        }
        target="_blank"
      >
        <ArrowSquareOut aria-hidden="true" /> 中文预览
      </Link>
      <form action={action}>
        <input
          name="expectedDraftVersion"
          type="hidden"
          value={draft.version}
        />
        <input name="partNumber" type="hidden" value={draft.partNumber} />
        <button
          className="admin-primary-button"
          disabled={pending || draft.lastPublishedVersion === draft.version}
          type="submit"
        >
          <CheckCircle aria-hidden="true" />
          {pending ? "发布中…" : "发布产品"}
        </button>
      </form>
      <MutationFeedback onFieldNavigate={onFieldNavigate} state={state} />
    </div>
  );
}

function RestoreVersionButton({
  draft,
  publicationId,
}: {
  draft: ProductEditorDraftView;
  publicationId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(
    restoreProductPublicationAction,
    initialProductMutationState,
  );

  return (
    <div className="product-version-action">
      <button
        className="admin-secondary-button"
        disabled={pending}
        onClick={() => setConfirming(true)}
        type="button"
      >
        <ArrowCounterClockwise aria-hidden="true" /> 恢复为新草稿
      </button>
      {confirming ? (
        <div className="product-confirm-dialog-backdrop">
          <div aria-modal="true" role="alertdialog">
            <strong>确认恢复这个发布版本？</strong>
            <p>
              当前未发布草稿会被替换；前台公开版本不会改变，仍需重新发布才会生效。
            </p>
            <div>
              <button
                className="admin-secondary-button"
                onClick={() => setConfirming(false)}
                type="button"
              >
                取消
              </button>
              <form action={action}>
                <input
                  name="expectedDraftVersion"
                  type="hidden"
                  value={draft.version}
                />
                <input
                  name="partNumber"
                  type="hidden"
                  value={draft.partNumber}
                />
                <input
                  name="publicationId"
                  type="hidden"
                  value={publicationId}
                />
                <button className="admin-primary-button" disabled={pending}>
                  {pending ? "恢复中…" : "确认恢复为新草稿"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      <MutationFeedback state={state} />
    </div>
  );
}

function DeleteDraftButton({ draft }: { draft: ProductEditorDraftView }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(
    deleteProductDraftAction,
    initialProductMutationState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.replace("/admin/products");
    }
  }, [router, state.status]);

  return (
    <div className="product-delete-form">
      <button
        className="admin-danger-button"
        disabled={pending || draft.publications.length > 0}
        onClick={() => setConfirming(true)}
        type="button"
      >
        <Trash aria-hidden="true" />
        永久删除未发布草稿
      </button>
      {draft.publications.length > 0 ? (
        <small>已有发布历史的产品不能硬删除。</small>
      ) : null}
      {confirming ? (
        <div className="product-confirm-dialog-backdrop">
          <div aria-modal="true" role="alertdialog">
            <strong>永久删除这个草稿？</strong>
            <p>此操作不可撤销；服务端会再次确认它没有发布历史或业务引用。</p>
            <div>
              <button
                className="admin-secondary-button"
                onClick={() => setConfirming(false)}
                type="button"
              >
                取消
              </button>
              <form action={action}>
                <input
                  name="expectedDraftVersion"
                  type="hidden"
                  value={draft.version}
                />
                <input
                  name="partNumber"
                  type="hidden"
                  value={draft.partNumber}
                />
                <button className="admin-danger-button" disabled={pending}>
                  {pending ? "删除中…" : "确认永久删除"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      <MutationFeedback state={state} />
    </div>
  );
}

function LanguageFields({
  draft,
  english,
}: {
  draft: ProductEditorDraftView;
  english: boolean;
}) {
  const suffix = english ? "En" : "ZhCn";

  return (
    <fieldset className="product-language-fields">
      <legend>{english ? "English public content" : "简体中文公开内容"}</legend>
      <label>
        <span>{english ? "Product name" : "产品名称"}</span>
        <input
          defaultValue={english ? draft.nameEn : draft.nameZhCn}
          id={"name" + suffix}
          name={"name" + suffix}
        />
      </label>
      <label>
        <span>{english ? "URL slug" : "本地化地址片段"}</span>
        <input
          defaultValue={english ? draft.slugEn : draft.slugZhCn}
          id={"slug" + suffix}
          name={"slug" + suffix}
        />
      </label>
      <label className="is-wide">
        <span>{english ? "Short description" : "短描述"}</span>
        <textarea
          defaultValue={english ? draft.summaryEn : draft.summaryZhCn}
          id={"summary" + suffix}
          name={"summary" + suffix}
          rows={3}
        />
      </label>
      <label className="is-wide">
        <span>{english ? "Full description" : "完整描述"}</span>
        <textarea
          defaultValue={english ? draft.descriptionEn : draft.descriptionZhCn}
          id={"description" + suffix}
          name={"description" + suffix}
          rows={6}
        />
      </label>
      <label className="is-wide">
        <span>{english ? "Fitment summary" : "适配摘要"}</span>
        <textarea
          defaultValue={
            english ? draft.fitmentSummaryEn : draft.fitmentSummaryZhCn
          }
          id={"fitmentSummary" + suffix}
          name={"fitmentSummary" + suffix}
          rows={3}
        />
      </label>
      <label>
        <span>{english ? "SEO title" : "SEO 标题"}</span>
        <input
          defaultValue={english ? draft.seoTitleEn : draft.seoTitleZhCn}
          id={"seoTitle" + suffix}
          name={"seoTitle" + suffix}
        />
      </label>
      <label>
        <span>{english ? "Image alt text" : "图片替代文本"}</span>
        <input
          defaultValue={english ? draft.imageAltEn : draft.imageAltZhCn}
          id={"imageAlt" + suffix}
          name={"imageAlt" + suffix}
        />
      </label>
      <label className="is-wide">
        <span>{english ? "SEO description" : "SEO 描述"}</span>
        <textarea
          defaultValue={
            english ? draft.seoDescriptionEn : draft.seoDescriptionZhCn
          }
          id={"seoDescription" + suffix}
          name={"seoDescription" + suffix}
          rows={3}
        />
      </label>
    </fieldset>
  );
}

function SpecificationFields({ draft }: { draft: ProductEditorDraftView }) {
  return (
    <div className="product-specification-editor">
      {draft.specifications.map((specification) => {
        const name = "specification:" + specification.code + ":value";
        return (
          <label key={specification.code}>
            <span>{specification.label}</span>
            <input
              name={"specification:" + specification.code + ":type"}
              type="hidden"
              value={specification.dataType}
            />
            <input
              name={"specification:" + specification.code + ":required"}
              type="hidden"
              value={String(specification.required)}
            />
            {specification.baseUnit ? (
              <input
                name={"specification:" + specification.code + ":unit"}
                type="hidden"
                value={specification.baseUnit}
              />
            ) : null}
            {specification.dataType === "enumeration" ? (
              <select
                defaultValue={specification.enumerationValue ?? ""}
                id={"specification-" + specification.code}
                name={name}
              >
                <option value="">请选择…</option>
                {specification.options.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : specification.dataType === "boolean" ? (
              <select
                defaultValue={
                  specification.booleanValue === null
                    ? ""
                    : String(specification.booleanValue)
                }
                id={"specification-" + specification.code}
                name={name}
              >
                <option value="">请选择…</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            ) : (
              <span className="product-value-with-unit">
                <input
                  defaultValue={
                    specification.dataType === "decimal"
                      ? (specification.decimalValue ?? "")
                      : (specification.textValue ?? "")
                  }
                  id={"specification-" + specification.code}
                  name={name}
                  step={
                    specification.dataType === "decimal" ? "any" : undefined
                  }
                  type={
                    specification.dataType === "decimal" ? "number" : "text"
                  }
                />
                {specification.baseUnit ? (
                  <small>{specification.baseUnit}</small>
                ) : null}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

export function ProductEditor({ draft }: { draft: ProductEditorDraftView }) {
  const [language, setLanguage] = useState<"en" | "zh">("zh");
  const [state, action, pending] = useActionState(
    saveProductDraftAction,
    initialProductMutationState,
  );
  const currentVersion = state.version ?? draft.version;
  const navigateToField = (field: string) => {
    if (field.endsWith("En")) {
      setLanguage("en");
    } else if (field.endsWith("ZhCn")) {
      setLanguage("zh");
    }

    window.setTimeout(() => document.getElementById(field)?.focus(), 0);
  };
  const requiredValues = [
    draft.nameEn,
    draft.nameZhCn,
    draft.summaryEn,
    draft.summaryZhCn,
    draft.descriptionEn,
    draft.descriptionZhCn,
    draft.seoTitleEn,
    draft.seoTitleZhCn,
    draft.seoDescriptionEn,
    draft.seoDescriptionZhCn,
    draft.fitmentSummaryEn,
    draft.fitmentSummaryZhCn,
    draft.imageAltEn,
    draft.imageAltZhCn,
    draft.slugEn,
    draft.slugZhCn,
  ];
  const checks = [
    { label: "中英文公开字段", passed: requiredValues.every(Boolean) },
    {
      label: "分类规格",
      passed:
        draft.specifications.length > 0 &&
        draft.specifications.every(({ complete }) => complete),
    },
    { label: "参考号", passed: draft.references.length > 0 },
    { label: "适配关系与摘要", passed: draft.fitmentCount > 0 },
    { label: "图片与替代文本", passed: Boolean(draft.imagePath) },
  ];

  return (
    <>
      <div className="product-editor-heading">
        <div>
          <p>产品内容 / {draft.partNumber}</p>
          <h1>{draft.nameZhCn || "未命名产品草稿"}</h1>
          <span>
            草稿 v{draft.version} ·{" "}
            {draft.publications[0]
              ? "最新发布版本 v" + draft.publications[0].version
              : "尚未发布"}
          </span>
        </div>
        <PublishControls
          draft={{ ...draft, version: currentVersion }}
          onFieldNavigate={navigateToField}
        />
      </div>

      <form action={action} className="product-editor-layout">
        <input name="categoryId" type="hidden" value={draft.categoryId} />
        <input
          name="expectedDraftVersion"
          type="hidden"
          value={currentVersion}
        />
        <input name="partNumber" type="hidden" value={draft.partNumber} />
        <aside className="product-editor-index">
          {[
            ["基础身份", "#product-section-1"],
            ["双语内容与 SEO", "#product-section-2"],
            ["分类规格", "#product-section-4"],
            ["参考号", "#product-section-5"],
            ["发布校验", "#product-publish-check"],
          ].map(([item, href], index) => (
            <a href={href} key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item}
            </a>
          ))}
        </aside>

        <div className="product-editor-form admin-section">
          <section id="product-section-1">
            <header>
              <p>01 / 基础身份</p>
              <h2>产品编号与发布后状态</h2>
            </header>
            <div className="product-field-grid">
              <label>
                <span>产品编号（只读）</span>
                <input disabled value={draft.partNumber} />
              </label>
              <label>
                <span>分类（由规格定义驱动）</span>
                <input disabled value={draft.categoryName} />
              </label>
              <label>
                <span>发布后状态</span>
                <select defaultValue={draft.status} name="status">
                  <option value="published">已发布／在售</option>
                  <option value="discontinued">已停产</option>
                </select>
              </label>
              <label>
                <span>替代产品编号（仅停产时）</span>
                <input
                  defaultValue={draft.replacementPartNumber ?? ""}
                  name="replacementPartNumber"
                />
              </label>
              <label className="is-wide">
                <span>产品图片路径</span>
                <input
                  defaultValue={draft.imagePath}
                  id="imagePath"
                  name="imagePath"
                />
              </label>
            </div>
          </section>

          <section id="product-section-2">
            <div className="product-language-tabs" role="tablist">
              <button
                aria-selected={language === "zh"}
                onClick={() => setLanguage("zh")}
                role="tab"
                type="button"
              >
                简体中文
              </button>
              <button
                aria-selected={language === "en"}
                onClick={() => setLanguage("en")}
                role="tab"
                type="button"
              >
                English
              </button>
            </div>
            <div hidden={language !== "zh"}>
              <LanguageFields draft={draft} english={false} />
            </div>
            <div hidden={language !== "en"}>
              <LanguageFields draft={draft} english />
            </div>
          </section>

          <section id="product-section-4">
            <header>
              <p>04 / 分类规格</p>
              <h2>{draft.categoryName}规格属性</h2>
            </header>
            <div id="specifications">
              <SpecificationFields draft={draft} />
            </div>
          </section>

          <section id="product-section-5">
            <header>
              <p>05 / 参考号</p>
              <h2>虚构品牌交叉参考</h2>
            </header>
            <label className="product-wide-field">
              <span>每行使用“品牌 | 号码”格式</span>
              <textarea
                defaultValue={draft.references
                  .map(
                    ({ brand, referenceNumber }) =>
                      brand + " | " + referenceNumber,
                  )
                  .join("\n")}
                id="references"
                name="references"
                rows={5}
              />
            </label>
          </section>

          <MutationFeedback onFieldNavigate={navigateToField} state={state} />
          <footer>
            <span>
              最后保存：{draft.lastModifiedBy} ·{" "}
              {new Date(draft.lastModifiedAt).toLocaleString("zh-CN", {
                timeZone: "Asia/Shanghai",
              })}
            </span>
            <button className="admin-primary-button" disabled={pending}>
              <FloppyDisk aria-hidden="true" />
              {pending ? "保存中…" : "保存草稿"}
            </button>
          </footer>
        </div>

        <aside className="product-publish-check" id="product-publish-check">
          <p>发布资格</p>
          <h2>
            {checks.filter(({ passed }) => passed).length} / {checks.length}{" "}
            项通过
          </h2>
          {checks.map((check) => (
            <div
              className={check.passed ? "is-passed" : "is-missing"}
              key={check.label}
            >
              {check.passed ? (
                <CheckCircle aria-hidden="true" weight="fill" />
              ) : (
                <Warning aria-hidden="true" weight="fill" />
              )}
              <span>{check.label}</span>
            </div>
          ))}
          <p className="product-draft-boundary">
            预览只读取当前草稿；保存不会改变前台或发布版本。
          </p>
        </aside>
      </form>

      <section className="admin-section product-version-history">
        <header>
          <div>
            <p>不可变发布版本</p>
            <h2>发布历史</h2>
          </div>
          <span>恢复只创建新草稿，不直接覆盖当前公开页面。</span>
        </header>
        {draft.publications.map((publication) => (
          <article key={publication.id}>
            <strong>v{publication.version}</strong>
            <span>
              <b>{publication.current ? "当前公开版本" : "历史发布版本"}</b>
              <small>
                {publication.publishedBy} ·{" "}
                {new Date(publication.publishedAt).toLocaleString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                })}
                {publication.restored ? " · 来自历史恢复草稿" : ""}
              </small>
            </span>
            <RestoreVersionButton
              draft={{ ...draft, version: currentVersion }}
              publicationId={publication.id}
            />
          </article>
        ))}
      </section>

      <section className="admin-section product-danger-zone">
        <div>
          <p>危险操作</p>
          <h2>永久删除草稿</h2>
          <span>
            只有从未发布、无引用且无历史的草稿可删除；已发布产品始终保留。
          </span>
        </div>
        <DeleteDraftButton draft={{ ...draft, version: currentVersion }} />
      </section>
    </>
  );
}

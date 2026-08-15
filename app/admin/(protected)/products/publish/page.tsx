import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { Warning } from "@phosphor-icons/react/dist/ssr/Warning";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { publishProductDraftBatchAction } from "@/app/admin/(protected)/products/actions";
import {
  previewProductPublishingBatch,
  ProductBatchPublishingError,
  type ProductPublishingBatchPreview,
  type ProductPublishingBatchSelection,
} from "@/src/application/product-publishing";
import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export const metadata: Metadata = { title: "批量发布预览 | Torquelis" };

const selectionSchema = z.object({
  expectedDraftVersion: z.number().int().positive(),
  partNumber: z.string().trim().min(1).max(80),
});

function parseSelections(
  value: string | string[] | undefined,
): ProductPublishingBatchSelection[] | null {
  const values =
    value === undefined ? [] : Array.isArray(value) ? value : [value];
  const decoded = values.map((item) => {
    try {
      return JSON.parse(item) as unknown;
    } catch {
      return null;
    }
  });
  const parsed = z.array(selectionSchema).min(1).max(100).safeParse(decoded);
  return parsed.success ? parsed.data : null;
}

const statusLabels: Record<
  ProductPublishingBatchPreview["items"][number]["status"],
  string
> = {
  already_published: "没有待发布修改",
  conflict: "草稿版本冲突",
  invalid: "发布校验失败",
  not_found: "产品或草稿不存在",
  ready: "校验通过",
};

const noticeMessages: Record<string, string> = {
  conflict: "草稿在预览后发生变化，整批没有发布。请刷新选择并重新预览。",
  forbidden: "你没有批量发布产品的权限。",
  "nothing-to-publish": "所选草稿已被发布，重复操作没有创建新版本。",
  "transaction-failed": "批量发布事务未完成，没有产生部分发布。请重试。",
  "validation-failed": "至少一个草稿未通过发布校验，整批没有发布。",
};

export default async function ProductPublishingBatchPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string | string[];
    selection?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const selections = parseSelections(query.selection);
  const path = "/admin/products/publish";
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.PRODUCTS_MANAGE,
    path,
  );
  if (!allowed) return <PermissionDenied role={actor.role} />;
  const noticeValue = query.notice;
  const notice = Array.isArray(noticeValue) ? noticeValue[0] : noticeValue;

  let preview: ProductPublishingBatchPreview | null = null;
  if (selections) {
    try {
      preview = await previewProductPublishingBatch({ actor, selections });
    } catch (error) {
      if (!(error instanceof ProductBatchPublishingError)) throw error;
    }
  }

  if (!selections || !preview) {
    return (
      <>
        <AdminPageHeader
          description="请从产品列表或导入批次选择 1–100 个草稿后进入发布预览。"
          eyebrow="产品内容 / 产品 / 批量发布"
          title="没有有效的发布选择"
        />
        <section className="admin-section product-batch-publish-empty">
          <Warning aria-hidden="true" size={42} weight="thin" />
          <h2>无法生成批量发布预览</h2>
          <p>选择中包含无效、重复或缺失的产品草稿。</p>
          <Link className="admin-primary-button" href="/admin/products">
            返回产品列表
          </Link>
        </section>
      </>
    );
  }

  const readyCount = preview.items.filter(
    ({ status }) => status === "ready",
  ).length;

  return (
    <>
      <AdminPageHeader
        description="系统已使用与正式发布相同的规则检查全部所选草稿；只有全部通过才会在一个事务中发布。"
        eyebrow="产品内容 / 产品 / 批量发布"
        title={`批量发布预览 · ${preview.items.length} 个草稿`}
      />
      {notice ? (
        <div className="admin-error-banner" role="alert">
          {noticeMessages[notice] ??
            "批量发布未完成，没有产生部分发布。请检查下方结果。"}
        </div>
      ) : null}
      <section className="admin-section product-batch-publish-summary">
        <div className={preview.allReady ? "is-ready" : "is-blocked"}>
          {preview.allReady ? (
            <CheckCircle aria-hidden="true" />
          ) : (
            <Warning aria-hidden="true" />
          )}
          <div>
            <strong>
              {preview.allReady
                ? "全部通过，可以原子批量发布"
                : "整批发布已被校验结果阻止"}
            </strong>
            <span>
              {readyCount} 个通过，{preview.items.length - readyCount}{" "}
              个需处理； 任一失败都不会发布任何所选产品。
            </span>
          </div>
        </div>
      </section>
      <section className="admin-section product-batch-publish-results">
        <header>
          <strong>产品草稿</strong>
          <strong>草稿版本</strong>
          <strong>校验结果</strong>
          <strong>具体问题</strong>
          <span />
        </header>
        {preview.items.map((item) => (
          <div key={item.partNumber}>
            <div>
              <code>{item.partNumber}</code>
              <span>{item.nameZhCn || "未找到当前草稿名称"}</span>
            </div>
            <span>v{item.expectedDraftVersion}</span>
            <strong className={`is-${item.status}`}>
              {statusLabels[item.status]}
            </strong>
            <ul>
              {item.fieldErrors.length > 0 ? (
                item.fieldErrors.map((fieldError, index) => (
                  <li key={`${fieldError.field}-${index}`}>
                    {fieldError.field}：{fieldError.message}
                  </li>
                ))
              ) : (
                <li>
                  {item.status === "ready"
                    ? "中英文内容、规格、参考号与发布关系均通过。"
                    : "刷新产品草稿后重新选择。"}
                </li>
              )}
            </ul>
            <Link
              className="admin-secondary-button"
              href={"/admin/products/" + encodeURIComponent(item.partNumber)}
            >
              查看产品
            </Link>
          </div>
        ))}
      </section>
      <div className="product-batch-publish-actions">
        <Link className="admin-secondary-button" href="/admin/products">
          <ArrowLeft aria-hidden="true" /> 返回修改选择
        </Link>
        <form action={publishProductDraftBatchAction}>
          {selections.map((selection) => (
            <input
              key={selection.partNumber}
              name="selection"
              type="hidden"
              value={JSON.stringify(selection)}
            />
          ))}
          <button
            className="admin-primary-button"
            disabled={!preview.allReady}
            type="submit"
          >
            原子发布全部 {preview.items.length} 个草稿
          </button>
        </form>
      </div>
    </>
  );
}

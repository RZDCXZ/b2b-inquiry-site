import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { FileArrowUp } from "@phosphor-icons/react/dist/ssr/FileArrowUp";
import Link from "next/link";
import { z } from "zod";

import { listProductDrafts } from "@/src/application/product-publishing";
import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { formatAdminTime } from "@/src/components/admin/admin-time";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    count?: string | string[];
    notice?: string | string[];
  }>;
}) {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.PRODUCTS_MANAGE,
    "/admin/products",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  const products = await listProductDrafts({ actor });
  const query = await searchParams;
  const noticeValue = query.notice;
  const notice = Array.isArray(noticeValue) ? noticeValue[0] : noticeValue;
  const countValue = Array.isArray(query.count) ? query.count[0] : query.count;
  const publishedCount = z.coerce
    .number()
    .int()
    .positive()
    .safeParse(countValue);

  return (
    <>
      <div className="product-admin-list-heading">
        <AdminPageHeader
          description="维护产品中英文内容、SEO、规格、参考号、适配摘要与发布状态。"
          eyebrow="产品内容 / 产品"
          title="产品目录"
        />
        <div className="product-admin-list-actions">
          <Link
            className="admin-secondary-button"
            download
            href="/admin/import/template"
            target="_blank"
          >
            <DownloadSimple aria-hidden="true" /> 下载模板
          </Link>
          <Link className="admin-primary-button" href="/admin/import">
            <FileArrowUp aria-hidden="true" /> 批量导入
          </Link>
          <button
            className="admin-secondary-button"
            form="product-bulk-publish-selection"
            type="submit"
          >
            预览批量发布
          </button>
        </div>
      </div>
      {notice === "bulk-published" ? (
        <div className="admin-success-banner" role="status">
          已在一个事务中发布{" "}
          {publishedCount.success ? publishedCount.data : "所选"}{" "}
          个产品草稿，并为每个产品创建不可变发布版本。
        </div>
      ) : notice ? (
        <div className="admin-error-banner" role="alert">
          批量发布选择无效或操作未完成；没有产生部分发布，请重新选择草稿。
        </div>
      ) : null}
      <form
        action="/admin/products/publish"
        id="product-bulk-publish-selection"
        method="get"
      >
        <section className="admin-section product-admin-list">
          <div className="product-admin-row product-admin-head">
            <strong>选择</strong>
            <strong>产品编号</strong>
            <strong>名称</strong>
            <strong>分类</strong>
            <strong>语言完整度</strong>
            <strong>状态</strong>
            <strong>最近修改</strong>
            <span />
          </div>
          {products.map((product) => {
            const draft = product.draft;
            const languageComplete = Boolean(
              draft?.languageCompleteness.en && draft.languageCompleteness.zhCn,
            );
            const hasUnpublishedChanges =
              draft?.lastPublishedVersion !== draft?.version;
            const href =
              "/admin/products/" + encodeURIComponent(product.partNumber);
            return (
              <div className="product-admin-row" key={product.id}>
                <input
                  aria-label={`选择 ${product.partNumber} 进行批量发布`}
                  disabled={!draft || !hasUnpublishedChanges}
                  name="selection"
                  type="checkbox"
                  value={
                    draft
                      ? JSON.stringify({
                          expectedDraftVersion: draft.version,
                          partNumber: product.partNumber,
                        })
                      : ""
                  }
                />
                <Link href={href}>
                  <code>{product.partNumber}</code>
                </Link>
                <strong>{draft?.nameZhCn || "未命名草稿"}</strong>
                <span>{product.category.nameZhCn}</span>
                <span>
                  {languageComplete ? "中 / EN 完整" : "存在缺失字段"}
                </span>
                <span className={"product-state is-" + product.status}>
                  {product.status === "draft"
                    ? "草稿"
                    : product.status === "discontinued"
                      ? "已停产"
                      : "已发布"}
                  {hasUnpublishedChanges ? " · 有未发布修改" : ""}
                </span>
                <span>
                  {draft?.lastModifiedBy?.name ?? "系统"}
                  {draft ? " · " + formatAdminTime(draft.updatedAt) : ""}
                </span>
                <Link aria-label={`打开 ${product.partNumber}`} href={href}>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            );
          })}
        </section>
      </form>
    </>
  );
}

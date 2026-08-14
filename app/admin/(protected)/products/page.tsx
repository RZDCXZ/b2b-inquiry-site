import { ArrowRight, FileArrowUp } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { listProductDrafts } from "@/src/application/product-publishing";
import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { formatAdminTime } from "@/src/components/admin/admin-time";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function ProductsPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.PRODUCTS_MANAGE,
    "/admin/products",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  const products = await listProductDrafts({ actor });

  return (
    <>
      <div className="product-admin-list-heading">
        <AdminPageHeader
          description="维护产品中英文内容、SEO、规格、参考号、适配摘要与发布状态。"
          eyebrow="产品内容 / 产品"
          title="产品目录"
        />
        <Link className="admin-primary-button" href="/admin/import">
          <FileArrowUp aria-hidden="true" /> 批量导入
        </Link>
      </div>
      <section className="admin-section product-admin-list">
        <div className="product-admin-row product-admin-head">
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
          return (
            <Link
              className="product-admin-row"
              href={"/admin/products/" + encodeURIComponent(product.partNumber)}
              key={product.id}
            >
              <code>{product.partNumber}</code>
              <strong>{draft?.nameZhCn || "未命名草稿"}</strong>
              <span>{product.category.nameZhCn}</span>
              <span>{languageComplete ? "中 / EN 完整" : "存在缺失字段"}</span>
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
              <ArrowRight aria-hidden="true" />
            </Link>
          );
        })}
      </section>
    </>
  );
}

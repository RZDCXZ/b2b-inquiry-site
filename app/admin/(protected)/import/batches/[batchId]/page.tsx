import { CheckCircle, Package } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  getProductImportBatch,
  ProductImportError,
} from "@/src/application/product-import";
import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { formatAdminTime } from "@/src/components/admin/admin-time";
import { ProductImportSteps } from "@/src/components/admin/product-import-steps";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export const metadata: Metadata = { title: "导入批次结果 | Torquelis" };
const routeParamsSchema = z.object({ batchId: z.string().uuid() });

export default async function ProductImportBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const parsedParams = routeParamsSchema.safeParse(await params);
  if (!parsedParams.success) notFound();
  const { batchId } = parsedParams.data;
  const path = `/admin/import/batches/${encodeURIComponent(batchId)}`;
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.IMPORTS_MANAGE,
    path,
  );
  if (!allowed) return <PermissionDenied role={actor.role} />;

  const batch = await getProductImportBatch({ actor, batchId }).catch(
    (error: unknown) => {
      if (error instanceof ProductImportError && error.code === "NOT_FOUND") {
        notFound();
      }
      throw error;
    },
  );

  return (
    <>
      <AdminPageHeader
        description="导入只更新产品草稿，不自动改变公开版本。"
        eyebrow={`产品内容 / 批量导入 / 批次 ${batch.displayNumber}`}
        title={`${batch.affectedProductCount} 个草稿已更新`}
      />
      <ProductImportSteps current={4} />
      <section className="product-import-success admin-section">
        <CheckCircle aria-hidden="true" size={58} weight="thin" />
        <p>原子事务已完成</p>
        <h2>草稿导入成功，公开页面保持不变</h2>
        <span>
          新增 {batch.addedCount} 个草稿，更新 {batch.updatedCount}{" "}
          个草稿；工作簿未出现的产品没有改变。
        </span>
        <dl>
          <div>
            <dt>批次号</dt>
            <dd>{batch.displayNumber}</dd>
          </div>
          <div>
            <dt>文件</dt>
            <dd>{batch.originalFilename}</dd>
          </div>
          <div>
            <dt>操作者</dt>
            <dd>{batch.createdBy.name}</dd>
          </div>
          <div>
            <dt>完成时间</dt>
            <dd>{formatAdminTime(batch.createdAt)}</dd>
          </div>
        </dl>
        <div className="product-import-batch-items">
          {batch.items.map((item) => (
            <div key={item.partNumber}>
              <code>{item.partNumber}</code>
              <span>{item.productWasCreated ? "新增草稿" : "更新草稿"}</span>
              <strong>
                {item.beforeDraftVersion === null
                  ? `v${item.afterDraftVersion}`
                  : `v${item.beforeDraftVersion} → v${item.afterDraftVersion}`}
              </strong>
            </div>
          ))}
        </div>
        <div>
          <Link className="admin-primary-button" href="/admin/products">
            <Package aria-hidden="true" /> 查看产品草稿
          </Link>
          <Link className="admin-secondary-button" href="/admin/import">
            再次导入
          </Link>
        </div>
      </section>
    </>
  );
}

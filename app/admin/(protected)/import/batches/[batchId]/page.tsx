import { CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { Package } from "@phosphor-icons/react/dist/ssr/Package";
import { Warning } from "@phosphor-icons/react/dist/ssr/Warning";
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
import { ProductImportRollbackForm } from "@/src/components/admin/product-import-rollback-form";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export const metadata: Metadata = { title: "导入批次结果 | Torquelis" };
const routeParamsSchema = z.object({ batchId: z.string().uuid() });
const rollbackReasonLabels = {
  BUSINESS_HISTORY_AFTER_IMPORT: "导入后已产生业务历史",
  DRAFT_MISSING: "草稿已不存在",
  MODIFIED_AFTER_IMPORT: "导入后继续修改",
  PUBLISHED_AFTER_IMPORT: "导入后已发布",
} as const;

export default async function ProductImportBatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
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
  const noticeValue = (await searchParams).notice;
  const notice = Array.isArray(noticeValue) ? noticeValue[0] : noticeValue;
  const batchPresentation =
    batch.rollbackStatus === "rolled_back"
      ? {
          description:
            "撤销只恢复本批次影响的草稿；公开版本和未出现在工作簿中的产品保持不变。",
          heading: "批次已撤销，公开版本保持不变",
          label: "撤销事务已完成",
          summary: `已恢复 ${batch.updatedCount} 个既有草稿，并移除本批次新增且没有业务历史的 ${batch.addedCount} 个产品。`,
          title: `批次 ${batch.displayNumber} 已撤销`,
        }
      : batch.rollbackStatus === "conflict"
        ? {
            description:
              "撤销冲突会阻止整批操作，不会产生部分恢复；导入后的草稿和公开版本保持当前状态。",
            heading: "整批撤销被拒绝，未产生部分恢复",
            label: "撤销冲突",
            summary: `本批次涉及 ${batch.affectedProductCount} 个草稿；检测到导入后的业务变化，因此当前草稿没有被部分恢复。`,
            title: "整批撤销被拒绝",
          }
        : batch.rollbackStatus === "unavailable"
          ? {
              description:
                "此历史批次缺少完整草稿快照；公开版本和当前草稿均未被撤销操作改变。",
              heading: "缺少历史快照，不能安全撤销",
              label: "撤销不可用",
              summary: `本批次涉及 ${batch.affectedProductCount} 个草稿；系统没有足够证据执行安全的整批恢复。`,
              title: "批次不能安全撤销",
            }
          : {
              description: "导入只更新产品草稿，不自动改变公开版本。",
              heading: "草稿导入成功，公开页面保持不变",
              label: "原子事务已完成",
              summary: `新增 ${batch.addedCount} 个草稿，更新 ${batch.updatedCount} 个草稿；工作簿未出现的产品没有改变。`,
              title: `${batch.affectedProductCount} 个草稿已更新`,
            };

  return (
    <>
      <AdminPageHeader
        description={batchPresentation.description}
        eyebrow={`产品内容 / 批量导入 / 批次 ${batch.displayNumber}`}
        title={batchPresentation.title}
      />
      <ProductImportSteps current={4} />
      {notice === "rolled-back" ? (
        <div className="admin-success-banner" role="status">
          该导入批次已原子撤销；公开版本保持不变，可以修正或直接重新导入同一工作簿。
        </div>
      ) : notice && notice !== "rolled-back" ? (
        <div className="admin-error-banner" role="alert">
          撤销未执行。请查看下方当前资格与冲突原因后再决定下一步。
        </div>
      ) : null}
      <section
        className={`product-import-success admin-section is-${batch.rollbackStatus}`}
      >
        {batch.rollbackStatus === "conflict" ||
        batch.rollbackStatus === "unavailable" ? (
          <Warning aria-hidden="true" size={58} weight="thin" />
        ) : (
          <CheckCircle aria-hidden="true" size={58} weight="thin" />
        )}
        <p>{batchPresentation.label}</p>
        <h2>{batchPresentation.heading}</h2>
        <span>{batchPresentation.summary}</span>
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
          <div>
            <dt>撤销资格</dt>
            <dd>
              {batch.rollbackStatus === "eligible"
                ? "可安全整批撤销"
                : batch.rollbackStatus === "conflict"
                  ? "存在导入冲突"
                  : batch.rollbackStatus === "rolled_back"
                    ? "已撤销"
                    : "缺少历史快照"}
            </dd>
          </div>
        </dl>
        {batch.rollbackStatus === "eligible" ? (
          <div className="product-import-rollback-status is-eligible">
            <div>
              <strong>当前可安全整批撤销</strong>
              <span>
                所有受影响草稿仍是本批次导入后的版本，且没有被发布或继续修改。
              </span>
            </div>
            <ProductImportRollbackForm batchId={batch.id} />
          </div>
        ) : batch.rollbackStatus === "conflict" ? (
          <div className="product-import-rollback-status is-conflict">
            <div className="product-import-conflict-heading">
              <Warning aria-hidden="true" />
              <div>
                <strong>整批撤销已被导入冲突阻止</strong>
                <span>
                  系统没有修改任何产品。已发布内容请使用发布版本恢复；后续编辑请先查看草稿。
                </span>
              </div>
            </div>
            <div className="product-import-conflicts">
              {batch.rollbackConflicts.map((conflict) => (
                <div key={conflict.partNumber}>
                  <div>
                    <code>{conflict.partNumber}</code>
                    <strong>
                      {conflict.reasons
                        .map((reason) => rollbackReasonLabels[reason])
                        .join("、")}
                    </strong>
                    <span>
                      {conflict.lastModifiedBy}
                      {conflict.lastModifiedAt
                        ? ` · ${formatAdminTime(conflict.lastModifiedAt)}`
                        : ""}
                    </span>
                  </div>
                  <Link
                    className="admin-secondary-button"
                    href={
                      "/admin/products/" +
                      encodeURIComponent(conflict.partNumber)
                    }
                  >
                    查看产品
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : batch.rollbackStatus === "rolled_back" ? (
          <div className="product-import-rollback-status is-rolled-back">
            <strong>批次已撤销</strong>
            <span>
              {batch.rolledBackBy?.name ?? "系统"} ·{" "}
              {batch.rolledBackAt ? formatAdminTime(batch.rolledBackAt) : ""}
              ；重复撤销不会再次改变数据。
            </span>
          </div>
        ) : (
          <div className="product-import-rollback-status is-conflict">
            <strong>此历史批次缺少完整草稿快照，不能安全撤销</strong>
            <span>请查看产品草稿；已发布内容只能通过发布版本恢复。</span>
          </div>
        )}
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
        {batch.rollbackStatus !== "rolled_back" ? (
          <form
            action="/admin/products/publish"
            className="product-import-bulk-publish"
            method="get"
          >
            <div>
              <strong>选择草稿进入批量发布预览</strong>
              <span>
                发布前会重新检查全部所选产品；只有全部通过才会原子发布整批。
              </span>
            </div>
            <div className="product-import-publish-selections">
              {batch.items.map((item) => (
                <label key={item.partNumber}>
                  <input
                    defaultChecked
                    name="selection"
                    type="checkbox"
                    value={JSON.stringify({
                      expectedDraftVersion: item.afterDraftVersion,
                      partNumber: item.partNumber,
                    })}
                  />
                  <code>{item.partNumber}</code>
                  <span>草稿 v{item.afterDraftVersion}</span>
                </label>
              ))}
            </div>
            <button className="admin-primary-button" type="submit">
              预览批量发布
            </button>
          </form>
        ) : null}
        <div className="product-import-result-actions">
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

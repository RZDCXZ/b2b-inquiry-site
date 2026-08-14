import { ArrowRight, ClipboardText } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { listInquiriesForActor } from "@/src/application/admin-inquiries";
import {
  AdminPageHeader,
  AdminSection,
} from "@/src/components/admin/admin-page";
import {
  formatAdminDate,
  formatAdminTime,
} from "@/src/components/admin/admin-time";
import { InquiryStatus } from "@/src/components/admin/inquiry-status";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";

type InquiryList = Awaited<ReturnType<typeof listInquiriesForActor>>;

function sourceLabel(sourcePage: string): string {
  return sourcePage.includes("/products/") ? "产品详情" : "通用询盘";
}

export function InquiryWorkbench({
  actor,
  inquiries,
}: {
  actor: AdminActor;
  inquiries: InquiryList;
}) {
  const administrator = actor.role === APP_ROLES.ADMINISTRATOR;
  const pendingCount = inquiries.filter(
    ({ status }) => status === "pending_assignment",
  ).length;

  return (
    <>
      <AdminPageHeader
        description={
          administrator
            ? "待分配询盘优先显示；列表不铺开完整联系方式，进入详情后再按角色校验。"
            : "只显示当前由你负责的询盘；重新分配后列表和详情访问会立即更新。"
        }
        eyebrow="询盘运营 / 工作台"
        title={administrator ? "询盘工作台" : "我的询盘"}
      />
      <div className="inquiry-workbench-summary">
        <span>
          {administrator ? "待分配" : "当前负责"}
          <strong>{administrator ? pendingCount : inquiries.length}</strong>张
        </span>
        <small>完整联系方式只对管理员和当前负责人可见</small>
      </div>
      <AdminSection>
        {inquiries.length === 0 ? (
          <div className="admin-shell-state">
            <ClipboardText aria-hidden="true" size={44} weight="thin" />
            <span>{administrator ? "暂无询盘" : "暂无分配任务"}</span>
            <h2>
              {administrator
                ? "当前没有可处理的正常询盘"
                : "当前没有由你负责的询盘"}
            </h2>
            <p>
              {administrator
                ? "海外采购者提交正常询盘后，会在这里进入待分配状态。"
                : "管理员完成分配后，询盘会立即出现在你的工作台中。"}
            </p>
          </div>
        ) : (
          <div className="inquiry-table-scroll">
            <table className="inquiry-table">
              <thead>
                <tr>
                  <th>询盘参考号</th>
                  <th>公司 / 国家</th>
                  <th>关联产品</th>
                  <th>状态</th>
                  <th>当前负责人</th>
                  <th>来源</th>
                  <th>下一步</th>
                  <th>提交时间</th>
                  <th aria-label="打开详情" />
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inquiry) => {
                  const href = `/admin/inquiries/${encodeURIComponent(inquiry.referenceNumber)}`;

                  return (
                    <tr key={inquiry.referenceNumber}>
                      <td>
                        <Link className="inquiry-reference" href={href}>
                          {inquiry.referenceNumber}
                        </Link>
                      </td>
                      <td>
                        <strong>{inquiry.company}</strong>
                        <small>{inquiry.countryRegion}</small>
                      </td>
                      <td>{inquiry.product?.partNumber ?? "通用询盘"}</td>
                      <td>
                        <InquiryStatus status={inquiry.status} />
                      </td>
                      <td>{inquiry.currentOwner?.name ?? "—"}</td>
                      <td>{sourceLabel(inquiry.sourcePage)}</td>
                      <td>
                        {inquiry.nextStepDate
                          ? formatAdminDate(inquiry.nextStepDate)
                          : "—"}
                      </td>
                      <td>{formatAdminTime(inquiry.submittedAt)}</td>
                      <td>
                        <Link
                          aria-label={`打开 ${inquiry.referenceNumber}`}
                          href={href}
                        >
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </>
  );
}

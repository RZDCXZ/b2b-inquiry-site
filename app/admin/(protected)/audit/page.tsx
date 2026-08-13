import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { listRecentAuditLogs } from "@/src/modules/identity-access/server/audit-query";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function AuditPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.AUDIT_VIEW,
    "/admin/audit",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  const records = await listRecentAuditLogs(20);

  return (
    <>
      <AdminPageHeader
        description="只读记录不包含密码、会话值、完整联系方式或询盘留言。"
        eyebrow="系统管理 / 只读"
        title="审计日志"
      />
      <section className="admin-section admin-audit-table">
        <div className="admin-audit-row admin-audit-head">
          <strong>操作人</strong>
          <strong>时间</strong>
          <strong>动作</strong>
          <strong>对象</strong>
          <strong>变更摘要</strong>
        </div>
        {records.map((record) => (
          <div className="admin-audit-row" key={record.id}>
            <strong>{record.operator}</strong>
            <time>
              {record.occurredAt.toLocaleString("zh-CN", {
                timeZone: "Asia/Shanghai",
              })}
            </time>
            <span>{record.action}</span>
            <span>{record.target}</span>
            <span>{record.summary}</span>
          </div>
        ))}
      </section>
    </>
  );
}

import { Info } from "@phosphor-icons/react/dist/ssr";

import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";
import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import {
  PERMISSIONS,
  ROLE_LABELS,
} from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";
import { listNotificationOutbox } from "@/src/modules/notifications/server/notification-outbox-query";

function formatAdminTime(value: Date): string {
  return value.toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  });
}

export default async function OutboxPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.OUTBOX_VIEW,
    "/admin/outbox",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  const records = await listNotificationOutbox({
    prisma: getApplicationPrisma(),
  });

  return (
    <>
      <AdminPageHeader
        description="只展示本地捕获的通知集成点，不代表真实邮件已经发送或送达。"
        eyebrow="询盘运营 / 本地模拟"
        title="通知发件箱"
      />
      <div className="admin-outbox-boundary">
        <Info aria-hidden="true" weight="fill" />
        <div>
          <strong>已捕获（本地模拟）</strong>
          <p>垃圾询盘不会产生记录；这里没有 Sent 或 Delivered 状态。</p>
        </div>
      </div>
      <section className="admin-section admin-outbox-table">
        <div className="admin-outbox-row admin-outbox-head">
          <strong>捕获时间</strong>
          <strong>收件角色</strong>
          <strong>模板</strong>
          <strong>关联询盘</strong>
          <strong>内容预览</strong>
          <strong>状态</strong>
        </div>
        {records.map((record) => (
          <div className="admin-outbox-row" key={record.id}>
            <time>{formatAdminTime(record.createdAt)}</time>
            <span>
              {ROLE_LABELS[record.recipientRole]}
              {record.recipientName ? ` · ${record.recipientName}` : ""}
            </span>
            <code>
              {record.template === "inquiry_assigned_to_current_owner"
                ? "询盘已分配"
                : "新询盘待分配"}
            </code>
            <code>{record.inquiryReferenceNumber}</code>
            <span>{record.contentPreview}</span>
            <span className="admin-captured-status">已捕获（本地模拟）</span>
          </div>
        ))}
        {records.length === 0 ? (
          <div className="admin-shell-state">
            <span>暂无捕获记录</span>
            <h2>当前通知发件箱为空</h2>
            <p>正常询盘提交或分配当前负责人后，会在这里保留本地模拟记录。</p>
          </div>
        ) : null}
      </section>
    </>
  );
}

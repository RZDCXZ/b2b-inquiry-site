import { PermissionDenied } from "@/src/components/admin/admin-page";
import { AdminPlaceholderSection } from "@/src/components/admin/admin-placeholder-section";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function OutboxPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.OUTBOX_VIEW,
    "/admin/outbox",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  return (
    <AdminPlaceholderSection
      description="只展示本地捕获的通知，不代表真实邮件已经送达。"
      eyebrow="询盘运营 / 本地模拟"
      title="通知发件箱"
    />
  );
}

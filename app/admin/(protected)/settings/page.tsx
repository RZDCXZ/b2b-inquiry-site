import { PermissionDenied } from "@/src/components/admin/admin-page";
import { AdminPlaceholderSection } from "@/src/components/admin/admin-placeholder-section";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function SettingsPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.SETTINGS_MANAGE,
    "/admin/settings",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  return (
    <AdminPlaceholderSection
      description="维护公开企业资料；数据库与会话密钥始终由本地环境配置控制。"
      eyebrow="系统管理"
      title="站点配置"
    />
  );
}

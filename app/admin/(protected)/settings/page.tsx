import { getEditableSiteConfiguration } from "@/src/application/site-configuration";
import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { SiteSettingsForm } from "@/src/components/admin/site-settings-form";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function SettingsPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.SETTINGS_MANAGE,
    "/admin/settings",
  );
  if (!allowed) return <PermissionDenied role={actor.role} />;
  const settings = await getEditableSiteConfiguration({ actor });
  return (
    <>
      <AdminPageHeader
        description="只维护企业公开资料、默认 SEO 与本地模拟通知收件角色；环境安全配置没有后台入口。"
        eyebrow="站点配置"
        title="可编辑配置与环境边界"
      />
      <SiteSettingsForm
        settings={{
          ...settings,
          lastModifiedAt: settings.lastModifiedAt.toISOString(),
        }}
      />
    </>
  );
}

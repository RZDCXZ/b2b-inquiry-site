import { PermissionDenied } from "@/src/components/admin/admin-page";
import { AdminPlaceholderSection } from "@/src/components/admin/admin-placeholder-section";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function ImportPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.IMPORTS_MANAGE,
    "/admin/import",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  return (
    <AdminPlaceholderSection
      description="上传五工作表工作簿，先校验全部错误，再原子更新产品草稿。"
      eyebrow="内容运营 / Excel"
      title="批量导入"
    />
  );
}

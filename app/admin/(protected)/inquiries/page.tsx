import { PermissionDenied } from "@/src/components/admin/admin-page";
import { AdminPlaceholderSection } from "@/src/components/admin/admin-placeholder-section";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function InquiriesPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.INQUIRIES_VIEW,
    "/admin/inquiries",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  return (
    <AdminPlaceholderSection
      description="管理员查看全局询盘，业务人员只进入由自己负责的询盘范围。"
      eyebrow="询盘运营"
      title="询盘工作台"
    />
  );
}

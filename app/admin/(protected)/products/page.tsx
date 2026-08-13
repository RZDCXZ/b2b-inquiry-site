import { PermissionDenied } from "@/src/components/admin/admin-page";
import { AdminPlaceholderSection } from "@/src/components/admin/admin-placeholder-section";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function ProductsPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.PRODUCTS_MANAGE,
    "/admin/products",
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  return (
    <AdminPlaceholderSection
      description="维护标准替换件的中英文内容、规格、参考号和适配关系。"
      eyebrow="内容运营"
      title="产品内容"
    />
  );
}

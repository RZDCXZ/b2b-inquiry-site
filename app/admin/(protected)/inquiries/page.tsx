import { listInquiriesForActor } from "@/src/application/admin-inquiries";
import { PermissionDenied } from "@/src/components/admin/admin-page";
import { InquiryWorkbench } from "@/src/components/admin/inquiry-workbench";
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

  const inquiries = await listInquiriesForActor({ actor });

  return <InquiryWorkbench actor={actor} inquiries={inquiries} />;
}

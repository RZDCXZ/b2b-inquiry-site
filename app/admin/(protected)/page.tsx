import { getInquiryMetricsForActor } from "@/src/application/admin-inquiries";
import { Dashboard } from "@/src/components/admin/dashboard";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function AdminDashboardPage() {
  const { actor } = await authorizeAdminPage(
    PERMISSIONS.DASHBOARD_VIEW,
    "/admin",
  );
  const { total: inquiryTotal } = await getInquiryMetricsForActor({ actor });

  return <Dashboard actor={actor} inquiryTotal={inquiryTotal} />;
}

import type { ReactNode } from "react";

import { AdminShell } from "@/src/components/admin/admin-shell";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { actor } = await authorizeAdminPage(
    PERMISSIONS.DASHBOARD_VIEW,
    "/admin",
  );

  return <AdminShell actor={actor}>{children}</AdminShell>;
}

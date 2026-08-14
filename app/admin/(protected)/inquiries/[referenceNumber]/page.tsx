import { notFound } from "next/navigation";

import {
  getInquiryDetailForActor,
  InquiryAccessError,
  listAssignableSalesPeople,
} from "@/src/application/admin-inquiries";
import {
  PermissionDenied,
  CurrentOwnerPermissionDenied,
} from "@/src/components/admin/admin-page";
import { InquiryDetail } from "@/src/components/admin/inquiry-detail";
import {
  APP_ROLES,
  PERMISSIONS,
} from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function InquiryDetailPage({
  params,
}: PageProps<"/admin/inquiries/[referenceNumber]">) {
  const { referenceNumber } = await params;
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.INQUIRIES_VIEW,
    `/admin/inquiries/${encodeURIComponent(referenceNumber)}`,
  );

  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  const detailResult = await getInquiryDetailForActor({
    actor,
    referenceNumber,
  }).then(
    (detail) => ({ detail, status: "success" as const }),
    (error: unknown) => ({ error, status: "error" as const }),
  );

  if (detailResult.status === "error") {
    const { error } = detailResult;

    if (error instanceof InquiryAccessError) {
      if (error.code === "NOT_CURRENT_OWNER") {
        return (
          <CurrentOwnerPermissionDenied
            currentOwnerName={error.currentOwnerName}
          />
        );
      }

      if (error.code === "NOT_FOUND") {
        notFound();
      }
    }

    throw error;
  }

  const owners =
    actor.role === APP_ROLES.ADMINISTRATOR
      ? await listAssignableSalesPeople({ actor })
      : [];

  return (
    <InquiryDetail actor={actor} detail={detailResult.detail} owners={owners} />
  );
}

import {
  listRecentProductImportBatches,
  type ProductImportDashboardBatch,
} from "@/src/modules/catalog/server/operations-dashboard-query";
import { getContentPublishingDashboardCounts } from "@/src/modules/content-publishing/server/operations-dashboard-query";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import type {
  DueFollowUps,
  InquiryDashboardTask,
  InquiryStatusCounts,
} from "@/src/modules/inquiry-operations/public/operations-dashboard";
import {
  getAdministratorInquiryDashboard,
  getSalesInquiryDashboard,
} from "@/src/modules/inquiry-operations/server/operations-dashboard-query";

export type DashboardInquiryTask = InquiryDashboardTask;
export type DashboardImportBatch = ProductImportDashboardBatch;
export type { InquiryStatusCounts };

export type AdministratorOperationsDashboard = {
  closeResults: { invalid: number; lost: number; won: number };
  dueFollowUps: DueFollowUps;
  kind: "administrator";
  quotedCount: number;
  recentImports: DashboardImportBatch[];
  sourceCounts: Array<{ count: number; source: string }>;
  statusCounts: InquiryStatusCounts;
  tasks: DashboardInquiryTask[];
  unassignedCount: number;
};

export type SalesOperationsDashboard = {
  dueFollowUps: DueFollowUps;
  kind: "sales";
  statusCounts: InquiryStatusCounts;
  tasks: DashboardInquiryTask[];
  totalCount: number;
};

export type ContentEditorOperationsDashboard = {
  kind: "content_editor";
  pendingArticleDraftCount: number;
  pendingCorePageDraftCount: number;
  pendingProductDraftCount: number;
  recentImports: DashboardImportBatch[];
};

export type OperationsDashboard =
  | AdministratorOperationsDashboard
  | ContentEditorOperationsDashboard
  | SalesOperationsDashboard;

export async function getOperationsDashboardForActor({
  actor,
  now = new Date(),
}: {
  actor: AdminActor;
  now?: Date;
}): Promise<OperationsDashboard> {
  if (actor.role === APP_ROLES.ADMINISTRATOR) {
    const [inquiries, recentImports] = await Promise.all([
      getAdministratorInquiryDashboard({ now }),
      listRecentProductImportBatches(),
    ]);
    return { ...inquiries, kind: "administrator", recentImports };
  }

  if (actor.role === APP_ROLES.SALES) {
    const inquiries = await getSalesInquiryDashboard({
      currentOwnerId: actor.id,
      now,
    });
    return { ...inquiries, kind: "sales" };
  }

  const [content, recentImports] = await Promise.all([
    getContentPublishingDashboardCounts(),
    listRecentProductImportBatches(),
  ]);
  return { ...content, kind: "content_editor", recentImports };
}

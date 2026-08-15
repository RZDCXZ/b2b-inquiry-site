import type { Prisma } from "@/src/generated/prisma/client";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";

const inquiryStatuses = [
  "pending_assignment",
  "assigned",
  "in_progress",
  "quoted",
  "closed",
] as const;

type InquiryStatus = (typeof inquiryStatuses)[number];

export type InquiryStatusCounts = Record<InquiryStatus, number>;

export type DashboardInquiryTask = {
  company: string;
  currentOwnerName: string | null;
  nextStepDate: Date | null;
  productPartNumber: string | null;
  referenceNumber: string;
  sourcePage: string;
  status: InquiryStatus;
};

export type DashboardImportBatch = {
  affectedProductCount: number;
  batchLabel: string;
  createdAt: Date;
  createdBy: string;
  id: string;
  originalFilename: string;
  rolledBackAt: Date | null;
};

type DueFollowUps = {
  dueToday: number;
  overdue: number;
  total: number;
};

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

const dashboardInquirySelect = {
  company: true,
  currentOwner: { select: { name: true } },
  nextStepDate: true,
  product: { select: { partNumber: true } },
  referenceNumber: true,
  sourcePage: true,
  status: true,
} satisfies Prisma.InquirySelect;

function emptyStatusCounts(): InquiryStatusCounts {
  return {
    assigned: 0,
    closed: 0,
    in_progress: 0,
    pending_assignment: 0,
    quoted: 0,
  };
}

function statusCountsFromGroups(
  groups: Array<{ _count: { _all: number }; status: InquiryStatus }>,
): InquiryStatusCounts {
  const counts = emptyStatusCounts();
  for (const group of groups) {
    counts[group.status] = group._count._all;
  }
  return counts;
}

function dashboardDate(now: Date): Date {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(dateParts.find((item) => item.type === type)?.value);

  return new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
}

function toTask(
  record: Prisma.InquiryGetPayload<{ select: typeof dashboardInquirySelect }>,
): DashboardInquiryTask {
  return {
    company: record.company,
    currentOwnerName: record.currentOwner?.name ?? null,
    nextStepDate: record.nextStepDate,
    productPartNumber: record.product?.partNumber ?? null,
    referenceNumber: record.referenceNumber,
    sourcePage: record.sourcePage,
    status: record.status,
  };
}

function toImportBatch(record: {
  affectedProductCount: number;
  batchNumber: number;
  createdAt: Date;
  createdBy: { name: string };
  id: string;
  originalFilename: string;
  rolledBackAt: Date | null;
}): DashboardImportBatch {
  return {
    affectedProductCount: record.affectedProductCount,
    batchLabel: `B-${String(record.batchNumber).padStart(3, "0")}`,
    createdAt: record.createdAt,
    createdBy: record.createdBy.name,
    id: record.id,
    originalFilename: record.originalFilename,
    rolledBackAt: record.rolledBackAt,
  };
}

async function dueFollowUps(
  transaction: Prisma.TransactionClient,
  where: Prisma.InquiryWhereInput,
  today: Date,
): Promise<DueFollowUps> {
  const [overdue, dueToday] = await Promise.all([
    transaction.inquiry.count({
      where: {
        AND: [
          where,
          { nextStepDate: { lt: today }, status: { not: "closed" } },
        ],
      },
    }),
    transaction.inquiry.count({
      where: {
        AND: [where, { nextStepDate: today, status: { not: "closed" } }],
      },
    }),
  ]);

  return { dueToday, overdue, total: dueToday + overdue };
}

const recentImportQuery = {
  include: { createdBy: { select: { name: true } } },
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  take: 5,
} satisfies Prisma.ProductImportBatchFindManyArgs;

async function administratorDashboard(
  transaction: Prisma.TransactionClient,
  today: Date,
): Promise<AdministratorOperationsDashboard> {
  const [statusGroups, sourceGroups, closeGroups, due, tasks, recentImports] =
    await Promise.all([
      transaction.inquiry.groupBy({
        _count: { _all: true },
        by: ["status"],
      }),
      transaction.inquiry.groupBy({
        _count: { _all: true },
        by: ["sourcePage"],
      }),
      transaction.inquiry.groupBy({
        _count: { _all: true },
        by: ["closeResult"],
        where: { closeResult: { not: null } },
      }),
      dueFollowUps(transaction, {}, today),
      transaction.inquiry.findMany({
        orderBy: [
          { nextStepDate: { sort: "asc", nulls: "last" } },
          { submittedAt: "asc" },
          { referenceNumber: "asc" },
        ],
        select: dashboardInquirySelect,
        take: 8,
        where: {
          AND: [
            { status: { not: "closed" } },
            {
              OR: [
                { status: "pending_assignment" },
                { nextStepDate: { lte: today } },
              ],
            },
          ],
        },
      }),
      transaction.productImportBatch.findMany(recentImportQuery),
    ]);
  const statusCounts = statusCountsFromGroups(statusGroups);
  const closeResults = { invalid: 0, lost: 0, won: 0 };
  for (const group of closeGroups) {
    if (group.closeResult) {
      closeResults[group.closeResult] = group._count._all;
    }
  }

  return {
    closeResults,
    dueFollowUps: due,
    kind: "administrator",
    quotedCount: statusCounts.quoted,
    recentImports: recentImports.map(toImportBatch),
    sourceCounts: sourceGroups
      .map(({ _count, sourcePage }) => ({
        count: _count._all,
        source: sourcePage,
      }))
      .sort(
        (left, right) =>
          right.count - left.count || left.source.localeCompare(right.source),
      ),
    statusCounts,
    tasks: tasks.map(toTask),
    unassignedCount: statusCounts.pending_assignment,
  };
}

async function salesDashboard(
  transaction: Prisma.TransactionClient,
  actor: AdminActor,
  today: Date,
): Promise<SalesOperationsDashboard> {
  const where = { currentOwnerId: actor.id } satisfies Prisma.InquiryWhereInput;
  const [statusGroups, due, tasks] = await Promise.all([
    transaction.inquiry.groupBy({
      _count: { _all: true },
      by: ["status"],
      where,
    }),
    dueFollowUps(transaction, where, today),
    transaction.inquiry.findMany({
      orderBy: [
        { nextStepDate: { sort: "asc", nulls: "last" } },
        { referenceNumber: "asc" },
      ],
      select: dashboardInquirySelect,
      where: { ...where, status: { not: "closed" } },
    }),
  ]);
  const statusCounts = statusCountsFromGroups(statusGroups);

  return {
    dueFollowUps: due,
    kind: "sales",
    statusCounts,
    tasks: tasks.map(toTask),
    totalCount: inquiryStatuses.reduce(
      (total, status) => total + statusCounts[status],
      0,
    ),
  };
}

function countPendingDrafts(
  drafts: Array<{ lastPublishedVersion: number | null; version: number }>,
): number {
  return drafts.filter(
    ({ lastPublishedVersion, version }) => lastPublishedVersion !== version,
  ).length;
}

async function contentEditorDashboard(
  transaction: Prisma.TransactionClient,
): Promise<ContentEditorOperationsDashboard> {
  const [productDrafts, corePageDrafts, articleDrafts, recentImports] =
    await Promise.all([
      transaction.productDraft.findMany({
        select: { lastPublishedVersion: true, version: true },
      }),
      transaction.corePageDraft.findMany({
        select: { lastPublishedVersion: true, version: true },
      }),
      transaction.articleDraft.findMany({
        select: { lastPublishedVersion: true, version: true },
      }),
      transaction.productImportBatch.findMany(recentImportQuery),
    ]);

  return {
    kind: "content_editor",
    pendingArticleDraftCount: countPendingDrafts(articleDrafts),
    pendingCorePageDraftCount: countPendingDrafts(corePageDrafts),
    pendingProductDraftCount: countPendingDrafts(productDrafts),
    recentImports: recentImports.map(toImportBatch),
  };
}

export async function getOperationsDashboardForActor({
  actor,
  now = new Date(),
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  now?: Date;
  prisma?: ApplicationDatabase;
}): Promise<OperationsDashboard> {
  const today = dashboardDate(now);

  return prisma.$transaction(
    async (transaction) => {
      if (actor.role === APP_ROLES.ADMINISTRATOR) {
        return administratorDashboard(transaction, today);
      }
      if (actor.role === APP_ROLES.SALES) {
        return salesDashboard(transaction, actor, today);
      }
      return contentEditorDashboard(transaction);
    },
    { isolationLevel: "RepeatableRead" },
  );
}

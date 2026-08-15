import type { Prisma } from "@/src/generated/prisma/client";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import {
  INQUIRY_STATUSES,
  type InquiryStatus,
} from "@/src/modules/inquiry-operations/public/inquiry-lifecycle";
import type {
  AdministratorInquiryDashboard,
  DueFollowUps,
  InquiryDashboardTask,
  InquiryStatusCounts,
  SalesInquiryDashboard,
} from "@/src/modules/inquiry-operations/public/operations-dashboard";

const dashboardInquirySelect = {
  company: true,
  nextStepDate: true,
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
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}

function shanghaiDateOnly(now: Date): Date {
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
): InquiryDashboardTask {
  return {
    company: record.company,
    nextStepDate: record.nextStepDate,
    referenceNumber: record.referenceNumber,
    sourcePage: record.sourcePage,
    status: record.status,
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

export async function getAdministratorInquiryDashboard({
  now,
  prisma = getApplicationPrisma(),
}: {
  now: Date;
  prisma?: ApplicationDatabase;
}): Promise<AdministratorInquiryDashboard> {
  const today = shanghaiDateOnly(now);

  return prisma.$transaction(
    async (transaction) => {
      const [statusGroups, sourceGroups, closeGroups, due, tasks] =
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
        ]);
      const statusCounts = statusCountsFromGroups(statusGroups);
      const closeResults = { invalid: 0, lost: 0, won: 0 };
      for (const group of closeGroups) {
        if (group.closeResult)
          closeResults[group.closeResult] = group._count._all;
      }

      return {
        closeResults,
        dueFollowUps: due,
        quotedCount: statusCounts.quoted,
        sourceCounts: sourceGroups
          .map(({ _count, sourcePage }) => ({
            count: _count._all,
            source: sourcePage,
          }))
          .sort(
            (left, right) =>
              right.count - left.count ||
              left.source.localeCompare(right.source),
          ),
        statusCounts,
        tasks: tasks.map(toTask),
        unassignedCount: statusCounts.pending_assignment,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}

export async function getSalesInquiryDashboard({
  currentOwnerId,
  now,
  prisma = getApplicationPrisma(),
}: {
  currentOwnerId: string;
  now: Date;
  prisma?: ApplicationDatabase;
}): Promise<SalesInquiryDashboard> {
  const today = shanghaiDateOnly(now);

  return prisma.$transaction(
    async (transaction) => {
      const where = { currentOwnerId } satisfies Prisma.InquiryWhereInput;
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
        statusCounts,
        tasks: tasks.map(toTask),
        totalCount: INQUIRY_STATUSES.reduce(
          (total, status) => total + statusCounts[status],
          0,
        ),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}

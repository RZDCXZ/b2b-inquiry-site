import type { Prisma } from "@/src/generated/prisma/client";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import { transitionInquiryStatus } from "@/src/modules/inquiry-operations/public/inquiry-lifecycle";

export type InquiryAssignmentConflict = {
  latestModifiedAt: Date;
  latestModifiedBy: string;
  latestVersion: number;
};

export class InquiryAssignmentError extends Error {
  constructor(
    readonly code:
      | "CONFLICT"
      | "FORBIDDEN"
      | "INVALID_OWNER"
      | "INVALID_REASON"
      | "INVALID_STATUS"
      | "NOT_FOUND"
      | "OWNER_UNCHANGED",
    readonly conflict?: InquiryAssignmentConflict,
  ) {
    super(code);
    this.name = "InquiryAssignmentError";
  }
}

export class InquiryAccessError extends Error {
  constructor(
    readonly code: "FORBIDDEN_ROLE" | "NOT_CURRENT_OWNER" | "NOT_FOUND",
    readonly currentOwnerName?: string,
  ) {
    super(code);
    this.name = "InquiryAccessError";
  }
}

const inquiryDetailInclude = {
  assignmentHistory: {
    include: {
      assignedBy: { select: { id: true, name: true } },
      newOwner: { select: { id: true, name: true } },
      previousOwner: { select: { id: true, name: true } },
    },
    orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
  },
  currentOwner: { select: { id: true, name: true } },
  followUps: {
    include: {
      actor: { select: { id: true, name: true } },
      correctionOf: { select: { id: true, type: true } },
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
  },
  lastModifiedBy: { select: { id: true, name: true } },
  product: {
    select: {
      currentPublication: {
        select: {
          nameEn: true,
          nameZhCn: true,
          slugEn: true,
          slugZhCn: true,
        },
      },
      imagePath: true,
      partNumber: true,
    },
  },
  statusChanges: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
  },
} satisfies Prisma.InquiryInclude;

export async function getInquiryMetricsForActor({
  actor,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  prisma?: ApplicationDatabase;
}) {
  const where =
    actor.role === APP_ROLES.ADMINISTRATOR
      ? { status: "pending_assignment" as const }
      : actor.role === APP_ROLES.SALES
        ? { currentOwnerId: actor.id }
        : undefined;

  return { total: await prisma.inquiry.count({ where }) };
}

export async function listAssignableSalesPeople({
  actor,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  prisma?: ApplicationDatabase;
}) {
  if (actor.role !== APP_ROLES.ADMINISTRATOR) {
    throw new InquiryAccessError("FORBIDDEN_ROLE");
  }

  return prisma.user.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
    where: { role: APP_ROLES.SALES },
  });
}

export async function listInquiriesForActor({
  actor,
  prisma = getApplicationPrisma(),
}: {
  actor: AdminActor;
  prisma?: ApplicationDatabase;
}) {
  if (
    actor.role !== APP_ROLES.ADMINISTRATOR &&
    actor.role !== APP_ROLES.SALES
  ) {
    throw new InquiryAccessError("FORBIDDEN_ROLE");
  }

  return prisma.inquiry.findMany({
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }, { id: "asc" }],
    select: {
      company: true,
      countryRegion: true,
      currentOwner: { select: { id: true, name: true } },
      interfaceLanguage: true,
      nextStepDate: true,
      product: { select: { partNumber: true } },
      referenceNumber: true,
      sourcePage: true,
      status: true,
      submittedAt: true,
      version: true,
    },
    where:
      actor.role === APP_ROLES.SALES ? { currentOwnerId: actor.id } : undefined,
  });
}

export async function getInquiryDetailForActor({
  actor,
  prisma = getApplicationPrisma(),
  referenceNumber,
}: {
  actor: AdminActor;
  prisma?: ApplicationDatabase;
  referenceNumber: string;
}) {
  if (
    actor.role !== APP_ROLES.ADMINISTRATOR &&
    actor.role !== APP_ROLES.SALES
  ) {
    throw new InquiryAccessError("FORBIDDEN_ROLE");
  }

  const detail =
    actor.role === APP_ROLES.ADMINISTRATOR
      ? await prisma.inquiry.findUnique({
          include: inquiryDetailInclude,
          where: { referenceNumber },
        })
      : await prisma.inquiry.findFirst({
          include: inquiryDetailInclude,
          where: { currentOwnerId: actor.id, referenceNumber },
        });

  if (detail) {
    return detail;
  }

  const access = await prisma.inquiry.findUnique({
    select: { currentOwner: { select: { name: true } } },
    where: { referenceNumber },
  });

  if (!access) {
    throw new InquiryAccessError("NOT_FOUND");
  }

  throw new InquiryAccessError("NOT_CURRENT_OWNER", access.currentOwner?.name);
}

const inquiryConcurrencyProjection = {
  lastModifiedBy: { select: { name: true } },
  updatedAt: true,
  version: true,
} satisfies Prisma.InquirySelect;

async function getConflict(
  transaction: Prisma.TransactionClient,
  referenceNumber: string,
): Promise<InquiryAssignmentConflict> {
  const latest = await transaction.inquiry.findUniqueOrThrow({
    select: inquiryConcurrencyProjection,
    where: { referenceNumber },
  });

  return {
    latestModifiedAt: latest.updatedAt,
    latestModifiedBy: latest.lastModifiedBy?.name ?? "系统",
    latestVersion: latest.version,
  };
}

export async function assignInquiry({
  actor,
  expectedVersion,
  newOwnerId,
  now = new Date(),
  prisma = getApplicationPrisma(),
  reason,
  referenceNumber,
}: {
  actor: AdminActor;
  expectedVersion: number;
  newOwnerId: string;
  now?: Date;
  prisma?: ApplicationDatabase;
  reason: string;
  referenceNumber: string;
}) {
  if (actor.role !== APP_ROLES.ADMINISTRATOR) {
    throw new InquiryAssignmentError("FORBIDDEN");
  }

  const normalizedReason = reason.trim();

  if (normalizedReason.length < 2 || normalizedReason.length > 500) {
    throw new InquiryAssignmentError("INVALID_REASON");
  }

  return prisma.$transaction(async (transaction) => {
    const [inquiry, newOwner] = await Promise.all([
      transaction.inquiry.findUnique({
        select: {
          currentOwner: { select: { name: true } },
          currentOwnerId: true,
          id: true,
          referenceNumber: true,
          status: true,
          version: true,
        },
        where: { referenceNumber },
      }),
      transaction.user.findUnique({
        select: { id: true, name: true, role: true },
        where: { id: newOwnerId },
      }),
    ]);

    if (!inquiry) {
      throw new InquiryAssignmentError("NOT_FOUND");
    }

    if (!newOwner || newOwner.role !== APP_ROLES.SALES) {
      throw new InquiryAssignmentError("INVALID_OWNER");
    }

    if (inquiry.version !== expectedVersion) {
      throw new InquiryAssignmentError(
        "CONFLICT",
        await getConflict(transaction, referenceNumber),
      );
    }

    if (inquiry.currentOwnerId === newOwner.id) {
      throw new InquiryAssignmentError("OWNER_UNCHANGED");
    }

    const transition = transitionInquiryStatus(
      inquiry.status,
      inquiry.currentOwnerId ? "reassign" : "assign",
    );

    if (!transition.allowed) {
      throw new InquiryAssignmentError("INVALID_STATUS");
    }

    const update = await transaction.inquiry.updateMany({
      data: {
        currentOwnerId: newOwner.id,
        lastModifiedByUserId: actor.id,
        status: transition.status,
        updatedAt: now,
        version: { increment: 1 },
      },
      where: { id: inquiry.id, version: expectedVersion },
    });

    if (update.count !== 1) {
      throw new InquiryAssignmentError(
        "CONFLICT",
        await getConflict(transaction, referenceNumber),
      );
    }

    const event = inquiry.currentOwnerId
      ? "INQUIRY_REASSIGNED"
      : "INQUIRY_ASSIGNED";
    const previousOwnerName = inquiry.currentOwner?.name ?? "未分配";
    const nextVersion = expectedVersion + 1;

    await Promise.all([
      transaction.inquiryAssignment.create({
        data: {
          assignedAt: now,
          assignedByUserId: actor.id,
          fromVersion: expectedVersion,
          inquiryId: inquiry.id,
          newOwnerId: newOwner.id,
          previousOwnerId: inquiry.currentOwnerId,
          reason: normalizedReason,
          toVersion: nextVersion,
        },
      }),
      transaction.auditLog.create({
        data: {
          actorRole: actor.role,
          actorUserId: actor.id,
          event,
          outcome: "SUCCESS",
          summary: `当前负责人从${previousOwnerName}变更为${newOwner.name}。`,
          targetId: inquiry.id,
          targetType: "INQUIRY",
        },
      }),
      transaction.notificationOutboxRecord.create({
        data: {
          contentPreview: `询盘 ${inquiry.referenceNumber} 已分配给你，请在询盘工作台查看。`,
          createdAt: now,
          inquiryId: inquiry.id,
          inquiryReferenceNumber: inquiry.referenceNumber,
          recipientRole: APP_ROLES.SALES,
          recipientUserId: newOwner.id,
          template: "inquiry_assigned_to_current_owner",
        },
      }),
    ]);

    return {
      assignedAt: now,
      currentOwner: { id: newOwner.id, name: newOwner.name },
      event,
      version: nextVersion,
    };
  });
}

import type { Prisma } from "@/src/generated/prisma/client";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";
import {
  transitionInquiryStatus,
  type InquiryStatus,
} from "@/src/modules/inquiry-operations/public/inquiry-lifecycle";

export type InquiryLifecycleConflict = {
  latestModifiedAt: Date;
  latestModifiedBy: string;
  latestVersion: number;
};

export class InquiryLifecycleError extends Error {
  constructor(
    readonly code:
      | "CONFLICT"
      | "FORBIDDEN"
      | "INVALID_RECORD"
      | "INVALID_TRANSITION"
      | "NOT_CURRENT_OWNER"
      | "NOT_FOUND",
    readonly conflict?: InquiryLifecycleConflict,
  ) {
    super(code);
    this.name = "InquiryLifecycleError";
  }
}

const inquiryConcurrencyProjection = {
  lastModifiedBy: { select: { name: true } },
  updatedAt: true,
  version: true,
} satisfies Prisma.InquirySelect;

async function getConflict(
  transaction: Prisma.TransactionClient,
  referenceNumber: string,
): Promise<InquiryLifecycleConflict> {
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

const statusLabels: Record<InquiryStatus, string> = {
  assigned: "已分配",
  closed: "已关闭",
  in_progress: "跟进中",
  pending_assignment: "待分配",
  quoted: "已报价",
};

function followUpAuditSummary(
  type: "contact" | "correction" | "internal_note" | "quote",
  before: InquiryStatus,
  after: InquiryStatus,
): string {
  const typeLabels = {
    contact: "联系记录",
    correction: "更正记录",
    internal_note: "内部备注",
    quote: "报价记录",
  } as const;
  const transition =
    before === after
      ? `状态保持${statusLabels[after]}`
      : `状态从${statusLabels[before]}推进到${statusLabels[after]}`;

  return `追加${typeLabels[type]}；${transition}。`;
}

type AppendInquiryFollowUpBase = {
  actor: AdminActor;
  expectedVersion: number;
  nextStepDate?: Date | null;
  now?: Date;
  prisma?: ApplicationDatabase;
  referenceNumber: string;
  summary: string;
};

type AppendInquiryFollowUpInput = AppendInquiryFollowUpBase &
  (
    | { type: "contact" }
    | { type: "internal_note" }
    | { correctionOfId: string; type: "correction" }
    | {
        quoteAmount: string;
        quoteCurrency: "CNY" | "EUR" | "USD";
        quoteValidUntil: Date;
        type: "quote";
      }
  );

const quoteAmountPattern = /^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/u;

const followUpOperations = {
  contact: "add_contact",
  correction: "add_correction",
  internal_note: "add_internal_note",
  quote: "add_quote",
} as const;

export async function appendInquiryFollowUp(input: AppendInquiryFollowUpInput) {
  const {
    actor,
    expectedVersion,
    nextStepDate,
    now = new Date(),
    prisma = getApplicationPrisma(),
    referenceNumber,
    summary,
    type,
  } = input;

  if (actor.role !== APP_ROLES.SALES) {
    throw new InquiryLifecycleError("FORBIDDEN");
  }

  const normalizedSummary = summary.trim();

  if (normalizedSummary.length < 2 || normalizedSummary.length > 2_000) {
    throw new InquiryLifecycleError("INVALID_RECORD");
  }

  if (
    nextStepDate !== undefined &&
    nextStepDate !== null &&
    !Number.isFinite(nextStepDate.getTime())
  ) {
    throw new InquiryLifecycleError("INVALID_RECORD");
  }

  if (
    type === "quote" &&
    (!quoteAmountPattern.test(input.quoteAmount) ||
      Number(input.quoteAmount) <= 0 ||
      !Number.isFinite(input.quoteValidUntil.getTime()))
  ) {
    throw new InquiryLifecycleError("INVALID_RECORD");
  }

  return prisma.$transaction(async (transaction) => {
    const inquiry = await transaction.inquiry.findUnique({
      select: {
        currentOwnerId: true,
        id: true,
        status: true,
        version: true,
      },
      where: { referenceNumber },
    });

    if (!inquiry) {
      throw new InquiryLifecycleError("NOT_FOUND");
    }

    if (inquiry.currentOwnerId !== actor.id) {
      throw new InquiryLifecycleError("NOT_CURRENT_OWNER");
    }

    if (inquiry.version !== expectedVersion) {
      throw new InquiryLifecycleError(
        "CONFLICT",
        await getConflict(transaction, referenceNumber),
      );
    }

    if (type === "correction") {
      const correctedRecord = await transaction.inquiryFollowUp.findFirst({
        select: { id: true },
        where: { id: input.correctionOfId, inquiryId: inquiry.id },
      });

      if (!correctedRecord) {
        throw new InquiryLifecycleError("INVALID_RECORD");
      }
    }

    const transition = transitionInquiryStatus(
      inquiry.status,
      followUpOperations[type],
    );

    if (!transition.allowed) {
      throw new InquiryLifecycleError("INVALID_TRANSITION");
    }

    const nextVersion = expectedVersion + 1;
    const update = await transaction.inquiry.updateMany({
      data: {
        lastModifiedByUserId: actor.id,
        ...(nextStepDate === undefined ? {} : { nextStepDate }),
        status: transition.status,
        updatedAt: now,
        version: { increment: 1 },
      },
      where: {
        currentOwnerId: actor.id,
        id: inquiry.id,
        status: inquiry.status,
        version: expectedVersion,
      },
    });

    if (update.count !== 1) {
      throw new InquiryLifecycleError(
        "CONFLICT",
        await getConflict(transaction, referenceNumber),
      );
    }

    const [followUp] = await Promise.all([
      transaction.inquiryFollowUp.create({
        data: {
          actorUserId: actor.id,
          createdAt: now,
          fromVersion: expectedVersion,
          inquiryId: inquiry.id,
          nextStepDate,
          occurredAt: now,
          ...(type === "quote"
            ? {
                quoteAmount: input.quoteAmount,
                quoteCurrency: input.quoteCurrency,
                quoteValidUntil: input.quoteValidUntil,
              }
            : {}),
          ...(type === "correction"
            ? { correctionOfId: input.correctionOfId }
            : {}),
          statusAfter: transition.status,
          statusBefore: inquiry.status,
          summary: normalizedSummary,
          toVersion: nextVersion,
          type,
        },
      }),
      transaction.auditLog.create({
        data: {
          actorRole: actor.role,
          actorUserId: actor.id,
          event: "INQUIRY_FOLLOW_UP_ADDED",
          outcome: "SUCCESS",
          summary: followUpAuditSummary(
            type,
            inquiry.status,
            transition.status,
          ),
          targetId: inquiry.id,
          targetType: "INQUIRY",
        },
      }),
    ]);

    return { followUp, status: transition.status, version: nextVersion };
  });
}

type InquiryCloseResult = "invalid" | "lost" | "won";

const closeResultLabels: Record<InquiryCloseResult, string> = {
  invalid: "无效",
  lost: "未成交",
  won: "成交",
};

function normalizeLifecycleReason(reason: string | undefined): string | null {
  if (reason === undefined || reason.trim() === "") {
    return null;
  }

  const normalizedReason = reason.trim();

  if (normalizedReason.length < 2 || normalizedReason.length > 1_000) {
    throw new InquiryLifecycleError("INVALID_RECORD");
  }

  return normalizedReason;
}

export async function closeInquiry({
  actor,
  closeResult,
  expectedVersion,
  now = new Date(),
  prisma = getApplicationPrisma(),
  reason,
  referenceNumber,
}: {
  actor: AdminActor;
  closeResult: InquiryCloseResult;
  expectedVersion: number;
  now?: Date;
  prisma?: ApplicationDatabase;
  reason?: string;
  referenceNumber: string;
}) {
  if (actor.role !== APP_ROLES.SALES) {
    throw new InquiryLifecycleError("FORBIDDEN");
  }

  if (!Object.hasOwn(closeResultLabels, closeResult)) {
    throw new InquiryLifecycleError("INVALID_RECORD");
  }

  const normalizedReason = normalizeLifecycleReason(reason);

  return prisma.$transaction(async (transaction) => {
    const inquiry = await transaction.inquiry.findUnique({
      select: {
        currentOwnerId: true,
        id: true,
        status: true,
        version: true,
      },
      where: { referenceNumber },
    });

    if (!inquiry) {
      throw new InquiryLifecycleError("NOT_FOUND");
    }

    if (inquiry.currentOwnerId !== actor.id) {
      throw new InquiryLifecycleError("NOT_CURRENT_OWNER");
    }

    if (inquiry.version !== expectedVersion) {
      throw new InquiryLifecycleError(
        "CONFLICT",
        await getConflict(transaction, referenceNumber),
      );
    }

    const transition = transitionInquiryStatus(inquiry.status, "close");

    if (!transition.allowed) {
      throw new InquiryLifecycleError("INVALID_TRANSITION");
    }

    const nextVersion = expectedVersion + 1;
    const update = await transaction.inquiry.updateMany({
      data: {
        closedAt: now,
        closeResult,
        lastModifiedByUserId: actor.id,
        nextStepDate: null,
        status: transition.status,
        updatedAt: now,
        version: { increment: 1 },
      },
      where: {
        currentOwnerId: actor.id,
        id: inquiry.id,
        status: inquiry.status,
        version: expectedVersion,
      },
    });

    if (update.count !== 1) {
      throw new InquiryLifecycleError(
        "CONFLICT",
        await getConflict(transaction, referenceNumber),
      );
    }

    const [statusChange] = await Promise.all([
      transaction.inquiryStatusChange.create({
        data: {
          actorUserId: actor.id,
          closeResult,
          fromStatus: inquiry.status,
          fromVersion: expectedVersion,
          inquiryId: inquiry.id,
          occurredAt: now,
          reason: normalizedReason,
          toStatus: transition.status,
          toVersion: nextVersion,
        },
      }),
      transaction.auditLog.create({
        data: {
          actorRole: actor.role,
          actorUserId: actor.id,
          event: "INQUIRY_CLOSED",
          outcome: "SUCCESS",
          summary: `询盘从${statusLabels[inquiry.status]}关闭；关闭结果为${closeResultLabels[closeResult]}。`,
          targetId: inquiry.id,
          targetType: "INQUIRY",
        },
      }),
    ]);

    return { statusChange, status: transition.status, version: nextVersion };
  });
}

export async function reopenInquiry({
  actor,
  expectedVersion,
  now = new Date(),
  prisma = getApplicationPrisma(),
  reason,
  referenceNumber,
}: {
  actor: AdminActor;
  expectedVersion: number;
  now?: Date;
  prisma?: ApplicationDatabase;
  reason?: string;
  referenceNumber: string;
}) {
  if (actor.role !== APP_ROLES.ADMINISTRATOR) {
    throw new InquiryLifecycleError("FORBIDDEN");
  }

  const normalizedReason = normalizeLifecycleReason(reason);

  return prisma.$transaction(async (transaction) => {
    const inquiry = await transaction.inquiry.findUnique({
      select: { id: true, status: true, version: true },
      where: { referenceNumber },
    });

    if (!inquiry) {
      throw new InquiryLifecycleError("NOT_FOUND");
    }

    if (inquiry.version !== expectedVersion) {
      throw new InquiryLifecycleError(
        "CONFLICT",
        await getConflict(transaction, referenceNumber),
      );
    }

    const transition = transitionInquiryStatus(inquiry.status, "reopen");

    if (!transition.allowed) {
      throw new InquiryLifecycleError("INVALID_TRANSITION");
    }

    const nextVersion = expectedVersion + 1;
    const update = await transaction.inquiry.updateMany({
      data: {
        closedAt: null,
        closeResult: null,
        lastModifiedByUserId: actor.id,
        status: transition.status,
        updatedAt: now,
        version: { increment: 1 },
      },
      where: {
        id: inquiry.id,
        status: inquiry.status,
        version: expectedVersion,
      },
    });

    if (update.count !== 1) {
      throw new InquiryLifecycleError(
        "CONFLICT",
        await getConflict(transaction, referenceNumber),
      );
    }

    const [statusChange] = await Promise.all([
      transaction.inquiryStatusChange.create({
        data: {
          actorUserId: actor.id,
          fromStatus: inquiry.status,
          fromVersion: expectedVersion,
          inquiryId: inquiry.id,
          occurredAt: now,
          reason: normalizedReason,
          toStatus: transition.status,
          toVersion: nextVersion,
        },
      }),
      transaction.auditLog.create({
        data: {
          actorRole: actor.role,
          actorUserId: actor.id,
          event: "INQUIRY_REOPENED",
          outcome: "SUCCESS",
          summary: "询盘从已关闭重新打开并回到已分配。",
          targetId: inquiry.id,
          targetType: "INQUIRY",
        },
      }),
    ]);

    return { statusChange, status: transition.status, version: nextVersion };
  });
}

import type { Prisma } from "@/src/generated/prisma/client";
import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";
import { DEMO_DATASET_TIMESTAMP } from "@/src/modules/catalog/public/demo-catalog-fixtures";

const administratorId = "demo-user-administrator";
const salesIds = ["demo-user-sales", "demo-user-sales-secondary"] as const;
const demoProductIds = [
  "product-tq-af-2106",
  "product-tq-cf-3021",
  "product-tq-fl-4827",
  "product-tq-of-1038",
] as const;

const acceptedInquiryStates = [
  "pending_assignment",
  "pending_assignment",
  "pending_assignment",
  "pending_assignment",
  "assigned",
  "assigned",
  "assigned",
  "in_progress",
  "in_progress",
  "in_progress",
  "in_progress",
  "quoted",
  "quoted",
  "quoted",
  "closed",
  "closed",
  "closed",
  "closed",
] as const;

const closeResults = ["won", "won", "lost", "invalid"] as const;
const sourcePages = [
  "/en/inquiry",
  "/zh-cn/inquiry",
  "/en/products/TQ-FL-4827/high-efficiency-fuel-filter/inquiry",
  "/en/products?finder=vehicle",
  "/zh-cn/products/TQ-AF-2106/高容空气滤清器/inquiry",
] as const;

function inquiryTime(index: number, minuteOffset = 0): Date {
  return new Date(Date.UTC(2026, 7, 8, 2 + index * 10, minuteOffset, 0, 0));
}

function dateOnly(day: number): Date {
  return new Date(Date.UTC(2026, 7, day));
}

async function writeAcceptedInquiry(
  transaction: Prisma.TransactionClient,
  index: number,
): Promise<DemoInquiryNotificationTarget> {
  const number = index + 1;
  const suffix = String(number).padStart(4, "0");
  const status = acceptedInquiryStates[index]!;
  const submittedAt = inquiryTime(index);
  const submissionId = `demo-inquiry-submission-${suffix}`;
  const inquiryId = `demo-inquiry-${suffix}`;
  const referenceNumber = `TQI-DEMO-${suffix}`;
  const productId = number % 4 === 0 ? null : demoProductIds[index % 4]!;
  const ownerId = status === "pending_assignment" ? null : salesIds[index % 2]!;
  const closedIndex = status === "closed" ? index - 14 : -1;
  const closeResult = closedIndex >= 0 ? closeResults[closedIndex]! : undefined;
  const interfaceLanguage = index % 3 === 1 ? "zh_cn" : "en";
  const sourcePage = sourcePages[index % sourcePages.length]!;
  const hasContact =
    status === "in_progress" || status === "quoted" || status === "closed";
  const hasQuote = status === "quoted";
  const version =
    status === "pending_assignment"
      ? 1
      : status === "assigned"
        ? 2
        : hasQuote
          ? 4
          : status === "closed"
            ? 4
            : 3;
  const nextStepDate =
    status === "closed"
      ? null
      : number % 4 === 0
        ? dateOnly(16)
        : number % 4 === 1
          ? dateOnly(17)
          : number % 4 === 2
            ? dateOnly(18)
            : null;

  await transaction.inquirySubmission.create({
    data: {
      clientFingerprintHash: `demo-fingerprint-${suffix}`,
      completedAt: submittedAt,
      disposition: "accepted",
      expiresAt: inquiryTime(index, 20),
      id: submissionId,
      interfaceLanguage,
      issuedAt: inquiryTime(index, -1),
      productId,
      referenceNumber,
      sourcePage,
      tokenHash: `demo-token-${suffix}`,
    },
  });
  await transaction.inquiry.create({
    data: {
      closeResult,
      closedAt: status === "closed" ? inquiryTime(index, 18) : undefined,
      company: `Fictional Fleet Parts ${suffix}`,
      contactName: `Demo Buyer ${suffix}`,
      countryRegion: ["Singapore", "Chile", "Poland", "South Africa"][
        index % 4
      ]!,
      currentOwnerId: ownerId,
      customPackagingNeeded: number % 3 === 0,
      expectedQuantity: `${200 + number * 25} pcs`,
      id: inquiryId,
      interfaceLanguage,
      lastModifiedByUserId:
        status === "pending_assignment"
          ? null
          : status === "assigned"
            ? administratorId
            : ownerId,
      message:
        "Fictional demo inquiry requesting catalogue fitment confirmation and packaging context.",
      nextStepDate,
      phoneOrWhatsapp: number % 2 === 0 ? `+00 555 01${suffix}` : null,
      privacyConsentAt: submittedAt,
      privateLabelNeeded: number % 2 === 0,
      productId,
      referenceNumber,
      sourcePage,
      status,
      submissionId,
      submittedAt,
      targetMarket: ["Southeast Asia", "South America", "Central Europe"][
        index % 3
      ]!,
      updatedAt: inquiryTime(index, 18),
      version,
      workEmail: `buyer-${suffix}@fictional-fleet.example`,
    },
  });
  const notificationTarget = {
    assignedAt: ownerId ? inquiryTime(index, 5) : null,
    inquiryId,
    inquiryReferenceNumber: referenceNumber,
    recipientUserId: ownerId,
    submittedAt,
  };
  if (!ownerId) return notificationTarget;
  await transaction.inquiryAssignment.create({
    data: {
      assignedAt: inquiryTime(index, 5),
      assignedByUserId: administratorId,
      fromVersion: 1,
      id: `demo-assignment-${suffix}`,
      inquiryId,
      newOwnerId: ownerId,
      reason: "按虚构演示区域分配",
      toVersion: 2,
    },
  });
  if (!hasContact) return notificationTarget;
  await transaction.inquiryFollowUp.create({
    data: {
      actorUserId: ownerId,
      createdAt: inquiryTime(index, 10),
      fromVersion: 2,
      id: `demo-follow-up-contact-${suffix}`,
      inquiryId,
      nextStepDate: status === "closed" ? null : nextStepDate,
      occurredAt: inquiryTime(index, 10),
      statusAfter: "in_progress",
      statusBefore: "assigned",
      summary: "已通过虚构演示渠道确认车型、数量与目标市场，等待下一步资料。",
      toVersion: 3,
      type: "contact",
    },
  });

  if (hasQuote) {
    await transaction.inquiryFollowUp.create({
      data: {
        actorUserId: ownerId,
        createdAt: inquiryTime(index, 15),
        fromVersion: 3,
        id: `demo-follow-up-quote-${suffix}`,
        inquiryId,
        nextStepDate,
        occurredAt: inquiryTime(index, 15),
        quoteAmount: `${1200 + number * 100}.00`,
        quoteCurrency: ["USD", "EUR", "CNY"][index % 3] as
          "CNY" | "EUR" | "USD",
        quoteValidUntil: dateOnly(31),
        statusAfter: "quoted",
        statusBefore: "in_progress",
        summary: "已记录虚构演示报价金额与有效期，等待采购方反馈。",
        toVersion: 4,
        type: "quote",
      },
    });
  }

  if (status === "closed") {
    await transaction.inquiryStatusChange.create({
      data: {
        actorUserId: ownerId,
        closeResult,
        fromStatus: "in_progress",
        fromVersion: 3,
        id: `demo-status-close-${suffix}`,
        inquiryId,
        occurredAt: inquiryTime(index, 18),
        reason: "固定演示关闭结果",
        toStatus: "closed",
        toVersion: 4,
      },
    });
  }

  return notificationTarget;
}

async function writeQuarantinedInquiry(
  transaction: Prisma.TransactionClient,
  index: number,
): Promise<void> {
  const number = index + 19;
  const suffix = String(number).padStart(4, "0");
  const submittedAt = inquiryTime(number);
  const submissionId = `demo-inquiry-submission-${suffix}`;
  const referenceNumber = `TQI-DEMO-${suffix}`;
  await transaction.inquirySubmission.create({
    data: {
      clientFingerprintHash: `demo-spam-fingerprint-${suffix}`,
      completedAt: submittedAt,
      disposition: "quarantined",
      expiresAt: inquiryTime(number, 20),
      id: submissionId,
      interfaceLanguage: index === 0 ? "en" : "zh_cn",
      issuedAt: inquiryTime(number, -1),
      referenceNumber,
      sourcePage: index === 0 ? "/en/inquiry" : "/zh-cn/inquiry",
      tokenHash: `demo-spam-token-${suffix}`,
    },
  });
  await transaction.quarantinedInquiry.create({
    data: {
      company: `Fictional Quarantined Sender ${suffix}`,
      contactName: `Quarantined Demo ${suffix}`,
      countryRegion: "Fictional Region",
      customPackagingNeeded: false,
      expectedQuantity: "unknown",
      id: `demo-quarantined-inquiry-${suffix}`,
      interfaceLanguage: index === 0 ? "en" : "zh_cn",
      message:
        "Repeated promotional text retained only for spam-state demonstration.",
      privacyConsentAt: submittedAt,
      privateLabelNeeded: false,
      referenceNumber,
      sourcePage: index === 0 ? "/en/inquiry" : "/zh-cn/inquiry",
      spamReasons: index === 0 ? ["honeypot"] : ["submission_rate"],
      submissionId,
      submittedAt,
      workEmail: `quarantined-${suffix}@invalid.example`,
    },
  });
}

export type DemoInquiryNotificationTarget = {
  assignedAt: Date | null;
  inquiryId: string;
  inquiryReferenceNumber: string;
  recipientUserId: string | null;
  submittedAt: Date;
};

export async function seedInquiryDemoData(
  prisma: ApplicationDatabase,
): Promise<DemoInquiryNotificationTarget[]> {
  if ((await prisma.inquirySubmission.count()) > 0) return [];
  return prisma.$transaction(async (transaction) => {
    const notificationTargets: DemoInquiryNotificationTarget[] = [];
    for (const index of acceptedInquiryStates.keys()) {
      notificationTargets.push(await writeAcceptedInquiry(transaction, index));
    }
    await writeQuarantinedInquiry(transaction, 0);
    await writeQuarantinedInquiry(transaction, 1);
    await transaction.auditLog.createMany({
      data: [
        {
          actorRole: "administrator",
          actorUserId: administratorId,
          createdAt: DEMO_DATASET_TIMESTAMP,
          event: "INQUIRY_ASSIGNED",
          id: "demo-audit-inquiry-assigned",
          outcome: "SUCCESS",
          summary: "固定演示询盘已分配给当前负责人。",
          targetId: "demo-inquiry-0005",
          targetType: "INQUIRY",
        },
        {
          actorRole: "sales",
          actorUserId: salesIds[0],
          createdAt: DEMO_DATASET_TIMESTAMP,
          event: "INQUIRY_CLOSED",
          id: "demo-audit-inquiry-closed",
          outcome: "SUCCESS",
          summary: "固定演示询盘已关闭并记录脱敏关闭结果。",
          targetId: "demo-inquiry-0015",
          targetType: "INQUIRY",
        },
      ],
    });
    return notificationTargets;
  });
}

export async function replaceInquirySubmissionData(
  prisma: ApplicationDatabase,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT set_config(
        'torquelis.allow_inquiry_history_delete',
        'on',
        true
      )
    `;
    await transaction.inquiryStatusChange.deleteMany();
    await transaction.inquiryFollowUp.deleteMany();
    await transaction.inquiry.deleteMany();
    await transaction.quarantinedInquiry.deleteMany();
    await transaction.inquirySubmission.deleteMany();
  });
}

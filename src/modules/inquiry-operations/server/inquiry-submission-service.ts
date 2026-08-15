import { createHash, createHmac, randomBytes } from "node:crypto";

import type { Prisma } from "@/src/generated/prisma/client";
import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";
import {
  assessInquirySubmissionRisk,
  type InquirySpamReason,
} from "@/src/modules/inquiry-operations/public/inquiry-spam-assessment";
import {
  INQUIRY_SUBMISSION_SCHEMA,
  PUBLIC_INQUIRY_FIELD_NAMES,
  type PublicInquiryFieldName,
} from "@/src/modules/inquiry-operations/public/inquiry-submission";
import {
  inquiryLocaleFromDatabase,
  inquiryLocaleToDatabase,
} from "@/src/modules/inquiry-operations/server/inquiry-locale";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

const TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SERIALIZABLE_RETRY_LIMIT = 3;

type InquiryReceipt = {
  locale: PublicLocale;
  productId: string | null;
  referenceNumber: string;
};

export type InquirySubmissionResult = {
  duplicate: boolean;
  receipt: InquiryReceipt;
};

export type CaptureInquiryNotifications = (
  transaction: Prisma.TransactionClient,
  input: {
    company: string;
    countryRegion: string;
    createdAt: Date;
    inquiryId: string;
    referenceNumber: string;
  },
) => Promise<void>;

export class InquirySubmissionError extends Error {
  constructor(
    readonly code: "expired_token" | "invalid_fields" | "invalid_token",
    readonly fieldNames: PublicInquiryFieldName[] = [],
  ) {
    super(code);
    this.name = "InquirySubmissionError";
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashClientAddress(address: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`inquiry-rate-limit:v1:${address}`)
    .digest("hex");
}

function createReferenceNumber(): string {
  const random = randomBytes(16);
  const characters = Array.from(random, (value) =>
    REFERENCE_ALPHABET.at(value % REFERENCE_ALPHABET.length),
  ).join("");

  return `TQI-${characters.slice(0, 4)}-${characters.slice(4, 8)}-${characters.slice(8, 12)}-${characters.slice(12, 16)}`;
}

function completedResult(submission: {
  disposition: "accepted" | "quarantined" | null;
  interfaceLanguage: "en" | "zh_cn";
  productId: string | null;
  referenceNumber: string | null;
}): InquirySubmissionResult | null {
  if (!submission.disposition || !submission.referenceNumber) {
    return null;
  }

  return {
    duplicate: true,
    receipt: {
      locale: inquiryLocaleFromDatabase(submission.interfaceLanguage),
      productId: submission.productId,
      referenceNumber: submission.referenceNumber,
    },
  };
}

export function isRetryableInquirySubmissionConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  if (error.code === "P2034") {
    return true;
  }

  if (error.code !== "P2002") {
    return false;
  }

  // PostgreSQL may report concurrent inserts for the same submission as a
  // unique violation instead of a serializable transaction conflict.
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  if (message.includes("submission_id") || message.includes("submissionId")) {
    return true;
  }

  try {
    const metadata = JSON.stringify(
      "meta" in error && error.meta !== undefined ? error.meta : {},
    );
    return (
      metadata.includes("submission_id") || metadata.includes("submissionId")
    );
  } catch {
    return false;
  }
}

export async function createInquirySubmissionToken({
  locale,
  now = new Date(),
  prisma,
  productId,
  sourcePage,
}: {
  locale: PublicLocale;
  now?: Date;
  prisma: ApplicationDatabase;
  productId?: string;
  sourcePage: string;
}): Promise<string> {
  const token = randomBytes(32).toString("base64url");

  await prisma.inquirySubmission.create({
    data: {
      expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS),
      interfaceLanguage: inquiryLocaleToDatabase(locale),
      issuedAt: now,
      productId,
      sourcePage,
      tokenHash: hashToken(token),
    },
  });

  return token;
}

async function persistSubmission(
  transaction: Prisma.TransactionClient,
  input: {
    captureNotifications: CaptureInquiryNotifications;
    clientFingerprintHash: string;
    form: unknown;
    now: Date;
    tokenHash: string;
  },
): Promise<InquirySubmissionResult> {
  const submission = await transaction.inquirySubmission.findUnique({
    where: { tokenHash: input.tokenHash },
  });

  if (!submission) {
    throw new InquirySubmissionError("invalid_token");
  }

  const duplicate = completedResult(submission);

  if (duplicate) {
    return duplicate;
  }

  if (submission.expiresAt <= input.now) {
    throw new InquirySubmissionError("expired_token");
  }

  const parsedForm = INQUIRY_SUBMISSION_SCHEMA.safeParse(input.form);

  if (!parsedForm.success) {
    const fieldNames = [
      ...new Set(
        parsedForm.error.issues.flatMap((issue) => {
          const fieldName = issue.path[0];

          return typeof fieldName === "string" &&
            PUBLIC_INQUIRY_FIELD_NAMES.includes(
              fieldName as PublicInquiryFieldName,
            )
            ? [fieldName as PublicInquiryFieldName]
            : [];
        }),
      ),
    ];

    throw new InquirySubmissionError("invalid_fields", fieldNames);
  }

  const recentSubmissionCount = await transaction.inquirySubmission.count({
    where: {
      clientFingerprintHash: input.clientFingerprintHash,
      completedAt: {
        gte: new Date(input.now.getTime() - RATE_LIMIT_WINDOW_MS),
      },
    },
  });
  const assessment = assessInquirySubmissionRisk({
    honeypot: parsedForm.data.honeypot,
    issuedAt: submission.issuedAt,
    message: parsedForm.data.message,
    now: input.now,
    recentSubmissionCount,
  });
  const referenceNumber = createReferenceNumber();
  const commonRecord = {
    company: parsedForm.data.company,
    contactName: parsedForm.data.contactName,
    countryRegion: parsedForm.data.countryRegion,
    customPackagingNeeded: parsedForm.data.customPackagingNeeded,
    expectedQuantity: parsedForm.data.expectedQuantity,
    interfaceLanguage: submission.interfaceLanguage,
    message: parsedForm.data.message,
    phoneOrWhatsapp: parsedForm.data.phoneOrWhatsapp,
    privacyConsentAt: input.now,
    privateLabelNeeded: parsedForm.data.privateLabelNeeded,
    productId: submission.productId,
    referenceNumber,
    sourcePage: submission.sourcePage,
    submissionId: submission.id,
    submittedAt: input.now,
    targetMarket: parsedForm.data.targetMarket,
    workEmail: parsedForm.data.workEmail,
  } as const;

  if (assessment.disposition === "accepted") {
    const inquiry = await transaction.inquiry.create({
      data: {
        ...commonRecord,
      },
    });
    await input.captureNotifications(transaction, {
      company: parsedForm.data.company,
      countryRegion: parsedForm.data.countryRegion,
      createdAt: input.now,
      inquiryId: inquiry.id,
      referenceNumber,
    });
  } else {
    await transaction.quarantinedInquiry.create({
      data: {
        ...commonRecord,
        spamReasons: assessment.reasons satisfies InquirySpamReason[],
      },
    });
    await transaction.auditLog.create({
      data: {
        createdAt: input.now,
        event: "INQUIRY_QUARANTINED",
        outcome: "SUCCESS",
        summary: `询盘提交被隔离；风险规则命中 ${assessment.reasons.length} 项。`,
        targetId: referenceNumber,
        targetType: "QUARANTINED_INQUIRY",
      },
    });
  }

  await transaction.inquirySubmission.update({
    data: {
      clientFingerprintHash: input.clientFingerprintHash,
      completedAt: input.now,
      disposition: assessment.disposition,
      referenceNumber,
    },
    where: { id: submission.id },
  });

  return {
    duplicate: false,
    receipt: {
      locale: inquiryLocaleFromDatabase(submission.interfaceLanguage),
      productId: submission.productId,
      referenceNumber,
    },
  };
}

export async function submitInquiryWithToken({
  captureNotifications,
  clientAddress,
  fingerprintSecret,
  form,
  now = new Date(),
  prisma,
  token,
}: {
  captureNotifications: CaptureInquiryNotifications;
  clientAddress: string;
  fingerprintSecret: string;
  form: unknown;
  now?: Date;
  prisma: ApplicationDatabase;
  token: string;
}): Promise<InquirySubmissionResult> {
  if (!token || token.length > 200) {
    throw new InquirySubmissionError("invalid_token");
  }

  const transactionInput = {
    captureNotifications,
    clientFingerprintHash: hashClientAddress(clientAddress, fingerprintSecret),
    form,
    now,
    tokenHash: hashToken(token),
  };

  for (let attempt = 0; attempt < SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(
        (transaction) => persistSubmission(transaction, transactionInput),
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (
        !isRetryableInquirySubmissionConflict(error) ||
        attempt === SERIALIZABLE_RETRY_LIMIT - 1
      ) {
        throw error;
      }
    }
  }

  throw new Error("Inquiry submission retry limit was exhausted.");
}

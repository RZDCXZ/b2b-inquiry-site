import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";
import { inquiryLocaleFromDatabase } from "@/src/modules/inquiry-operations/server/inquiry-locale";

export function getInquiryByReference({
  prisma,
  referenceNumber,
}: {
  prisma: ApplicationDatabase;
  referenceNumber: string;
}) {
  return prisma.inquiry.findUnique({
    where: { referenceNumber },
  });
}

export function getQuarantinedInquiryByReference({
  prisma,
  referenceNumber,
}: {
  prisma: ApplicationDatabase;
  referenceNumber: string;
}) {
  return prisma.quarantinedInquiry.findUnique({
    where: { referenceNumber },
  });
}

export async function getPublicInquiryReceipt({
  prisma,
  referenceNumber,
}: {
  prisma: ApplicationDatabase;
  referenceNumber: string;
}) {
  const submission = await prisma.inquirySubmission.findUnique({
    where: { referenceNumber },
  });

  if (!submission?.completedAt || !submission.disposition) {
    return null;
  }

  return {
    locale: inquiryLocaleFromDatabase(submission.interfaceLanguage),
    productId: submission.productId,
    referenceNumber: submission.referenceNumber ?? referenceNumber,
  };
}

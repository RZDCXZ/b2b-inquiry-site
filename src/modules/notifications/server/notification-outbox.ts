import type { Prisma } from "@/src/generated/prisma/client";

export async function captureAdministratorInquiryNotification(
  transaction: Prisma.TransactionClient,
  input: {
    company: string;
    countryRegion: string;
    createdAt: Date;
    inquiryId: string;
    referenceNumber: string;
  },
): Promise<void> {
  await transaction.notificationOutboxRecord.create({
    data: {
      contentPreview: `New inquiry ${input.referenceNumber} from ${input.company} (${input.countryRegion}).`,
      createdAt: input.createdAt,
      inquiryId: input.inquiryId,
      inquiryReferenceNumber: input.referenceNumber,
      recipientRole: "administrator",
      template: "new_inquiry_for_administrator",
    },
  });
}

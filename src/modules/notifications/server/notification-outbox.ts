import type { AppRole, Prisma } from "@/src/generated/prisma/client";

export async function captureConfiguredInquiryNotifications(
  transaction: Prisma.TransactionClient,
  input: {
    company: string;
    countryRegion: string;
    createdAt: Date;
    inquiryId: string;
    referenceNumber: string;
  },
  recipients: ReadonlyArray<{
    role: AppRole;
    userId: string | null;
  }>,
): Promise<void> {
  await transaction.notificationOutboxRecord.createMany({
    data: recipients.map((recipient) => ({
      contentPreview: `New inquiry ${input.referenceNumber} from ${input.company} (${input.countryRegion}).`,
      createdAt: input.createdAt,
      inquiryId: input.inquiryId,
      inquiryReferenceNumber: input.referenceNumber,
      recipientRole: recipient.role,
      recipientUserId: recipient.userId,
      template: `new_inquiry_for_${recipient.role}`,
    })),
  });
}

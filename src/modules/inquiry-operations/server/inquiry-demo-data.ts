import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";

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

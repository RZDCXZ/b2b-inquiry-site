import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";

export async function replaceInquirySubmissionData(
  prisma: ApplicationDatabase,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.inquiry.deleteMany();
    await transaction.quarantinedInquiry.deleteMany();
    await transaction.inquirySubmission.deleteMany();
  });
}

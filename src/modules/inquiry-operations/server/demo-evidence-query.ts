import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";

export async function readInquiryDemoEvidence() {
  const prisma = getApplicationPrisma();
  const [inquiries, quarantinedInquiries] = await Promise.all([
    prisma.inquiry.count(),
    prisma.quarantinedInquiry.count(),
  ]);

  return {
    inquiries,
    quarantinedInquiries,
  };
}

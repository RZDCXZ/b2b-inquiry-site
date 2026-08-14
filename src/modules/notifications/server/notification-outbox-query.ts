import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";

export async function listNotificationOutbox({
  prisma,
}: {
  prisma: ApplicationDatabase;
}) {
  const records = await prisma.notificationOutboxRecord.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return records.map((record) => ({
    contentPreview: record.contentPreview,
    createdAt: record.createdAt,
    id: record.id,
    inquiryReferenceNumber: record.inquiryReferenceNumber,
    recipientRole: record.recipientRole,
    template: record.template,
  }));
}

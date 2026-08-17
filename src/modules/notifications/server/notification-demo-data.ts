import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";

type DemoNotificationTarget = {
  assignedAt: Date | null;
  inquiryId: string;
  inquiryReferenceNumber: string;
  recipientUserId: string | null;
  submittedAt: Date;
};

export async function seedNotificationDemoData(
  prisma: ApplicationDatabase,
  targets: DemoNotificationTarget[],
): Promise<void> {
  if ((await prisma.notificationOutboxRecord.count()) > 0) return;

  await prisma.$transaction(async (transaction) => {
    for (const target of targets) {
      const suffix = target.inquiryReferenceNumber.slice(-4);
      await transaction.notificationOutboxRecord.create({
        data: {
          contentPreview: `New fictional demo inquiry ${target.inquiryReferenceNumber}.`,
          createdAt: target.submittedAt,
          id: `demo-notification-admin-${suffix}`,
          inquiryId: target.inquiryId,
          inquiryReferenceNumber: target.inquiryReferenceNumber,
          recipientRole: "administrator",
          template: "new_inquiry_for_administrator",
        },
      });

      if (!target.assignedAt || !target.recipientUserId) continue;
      await transaction.notificationOutboxRecord.create({
        data: {
          contentPreview: `Fictional inquiry ${target.inquiryReferenceNumber} assigned for demo follow-up.`,
          createdAt: target.assignedAt,
          id: `demo-notification-sales-${suffix}`,
          inquiryId: target.inquiryId,
          inquiryReferenceNumber: target.inquiryReferenceNumber,
          recipientRole: "sales",
          recipientUserId: target.recipientUserId,
          template: "inquiry_assigned_to_current_owner",
        },
      });
    }
  });
}

export async function replaceNotificationData(
  prisma: ApplicationDatabase,
): Promise<void> {
  await prisma.notificationOutboxRecord.deleteMany();
}

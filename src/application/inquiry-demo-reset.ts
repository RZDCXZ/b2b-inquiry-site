import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";
import { replaceInquirySubmissionData } from "@/src/modules/inquiry-operations/server/inquiry-demo-data";
import { replaceNotificationData } from "@/src/modules/notifications/server/notification-demo-data";

export async function replaceInquiryAndNotificationData(
  prisma: ApplicationDatabase,
): Promise<void> {
  await replaceNotificationData(prisma);
  await replaceInquirySubmissionData(prisma);
}

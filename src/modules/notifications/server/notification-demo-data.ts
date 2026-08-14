import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";

export async function replaceNotificationData(
  prisma: ApplicationDatabase,
): Promise<void> {
  await prisma.notificationOutboxRecord.deleteMany();
}

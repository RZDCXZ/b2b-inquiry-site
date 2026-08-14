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
  const configuration = await transaction.siteConfiguration.findUnique({
    select: { notificationRecipientRoles: true },
    where: { key: "primary" },
  });
  const recipientRoles = configuration?.notificationRecipientRoles ?? [
    "administrator",
  ];
  const salesRecipient = recipientRoles.includes("sales")
    ? await transaction.user.findFirst({
        orderBy: { id: "asc" },
        select: { id: true },
        where: { role: "sales" },
      })
    : null;

  await transaction.notificationOutboxRecord.createMany({
    data: recipientRoles.flatMap((recipientRole) => {
      if (recipientRole === "sales" && !salesRecipient) return [];
      return [
        {
          contentPreview: `New inquiry ${input.referenceNumber} from ${input.company} (${input.countryRegion}).`,
          createdAt: input.createdAt,
          inquiryId: input.inquiryId,
          inquiryReferenceNumber: input.referenceNumber,
          recipientRole,
          recipientUserId:
            recipientRole === "sales" ? salesRecipient?.id : null,
          template: `new_inquiry_for_${recipientRole}`,
        },
      ];
    }),
  });
}

import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export async function resolveInquiryAuditTargetLabels({
  prisma = getApplicationPrisma(),
  targetIds,
}: {
  prisma?: ApplicationDatabase;
  targetIds: readonly string[];
}): Promise<ReadonlyMap<string, string>> {
  const ids = unique(targetIds);
  if (ids.length === 0) return new Map();

  const [inquiries, quarantinedInquiries] = await Promise.all([
    prisma.inquiry.findMany({
      select: { id: true, referenceNumber: true },
      where: {
        OR: [{ id: { in: ids } }, { referenceNumber: { in: ids } }],
      },
    }),
    prisma.quarantinedInquiry.findMany({
      select: { id: true, referenceNumber: true },
      where: {
        OR: [{ id: { in: ids } }, { referenceNumber: { in: ids } }],
      },
    }),
  ]);

  const labels = new Map<string, string>();
  for (const inquiry of [...inquiries, ...quarantinedInquiries]) {
    if (ids.includes(inquiry.id)) {
      labels.set(inquiry.id, inquiry.referenceNumber);
    }
    if (ids.includes(inquiry.referenceNumber)) {
      labels.set(inquiry.referenceNumber, inquiry.referenceNumber);
    }
  }
  return labels;
}

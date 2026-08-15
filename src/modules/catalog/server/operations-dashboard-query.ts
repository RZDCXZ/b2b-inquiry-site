import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";

export type ProductImportDashboardBatch = {
  affectedProductCount: number;
  batchLabel: string;
  createdAt: Date;
  createdBy: string;
  id: string;
  originalFilename: string;
  rolledBackAt: Date | null;
};

export async function listRecentProductImportBatches({
  prisma = getApplicationPrisma(),
  take = 5,
}: {
  prisma?: ApplicationDatabase;
  take?: number;
} = {}): Promise<ProductImportDashboardBatch[]> {
  const records = await prisma.productImportBatch.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });

  return records.map((record) => ({
    affectedProductCount: record.affectedProductCount,
    batchLabel: `B-${String(record.batchNumber).padStart(3, "0")}`,
    createdAt: record.createdAt,
    createdBy: record.createdBy.name,
    id: record.id,
    originalFilename: record.originalFilename,
    rolledBackAt: record.rolledBackAt,
  }));
}

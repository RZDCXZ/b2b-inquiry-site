import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import { formatProductImportBatchNumber } from "@/src/modules/catalog/public/product-import";

export type ProductImportDashboardBatch = {
  affectedProductCount: number;
  batchLabel: string;
  createdAt: Date;
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
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });

  return records.map((record) => ({
    affectedProductCount: record.affectedProductCount,
    batchLabel: formatProductImportBatchNumber(record.batchNumber),
    createdAt: record.createdAt,
    id: record.id,
    originalFilename: record.originalFilename,
    rolledBackAt: record.rolledBackAt,
  }));
}

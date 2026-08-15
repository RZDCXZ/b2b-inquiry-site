import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import { formatProductImportBatchNumber } from "@/src/modules/catalog/public/product-import";

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export type CatalogAuditTargetLabels = {
  importBatches: ReadonlyMap<string, string>;
  products: ReadonlyMap<string, string>;
};

export async function resolveCatalogAuditTargetLabels({
  importBatchTargetIds,
  prisma = getApplicationPrisma(),
  productTargetIds,
}: {
  importBatchTargetIds: readonly string[];
  prisma?: ApplicationDatabase;
  productTargetIds: readonly string[];
}): Promise<CatalogAuditTargetLabels> {
  const productIds = unique(productTargetIds);
  const importBatchIds = unique(importBatchTargetIds);
  const [products, importBatches] = await Promise.all([
    productIds.length === 0
      ? []
      : prisma.product.findMany({
          select: { id: true, partNumber: true },
          where: {
            OR: [
              { id: { in: productIds } },
              { partNumber: { in: productIds } },
            ],
          },
        }),
    importBatchIds.length === 0
      ? []
      : prisma.productImportBatch.findMany({
          select: { batchNumber: true, id: true },
          where: { id: { in: importBatchIds } },
        }),
  ]);

  const productLabels = new Map<string, string>();
  for (const product of products) {
    if (productIds.includes(product.id)) {
      productLabels.set(product.id, product.partNumber);
    }
    if (productIds.includes(product.partNumber)) {
      productLabels.set(product.partNumber, product.partNumber);
    }
  }

  const importBatchLabels = new Map<string, string>();
  for (const targetId of importBatchIds) {
    if (/^B-\d{3,}$/u.test(targetId)) {
      importBatchLabels.set(targetId, targetId);
    }
  }
  for (const batch of importBatches) {
    importBatchLabels.set(
      batch.id,
      formatProductImportBatchNumber(batch.batchNumber),
    );
  }

  return { importBatches: importBatchLabels, products: productLabels };
}

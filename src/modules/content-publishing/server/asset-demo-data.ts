import type { PrismaClient } from "@/src/generated/prisma/client";

const standardGeneratedAssets = [
  {
    byteSize: 1_742_997,
    id: "asset-generated-filter-family",
    imageAltEn: "Torquelis filter product family",
    imageAltZhCn: "拓擎利滤清产品系列",
    kind: "image" as const,
    mimeType: "image/png",
    originalFilename: "filter-family.png",
    publicPath: "/assets/filter-family.png",
    source: "generated" as const,
    storageFilename: "filter-family.png",
  },
  {
    byteSize: 883_919,
    id: "asset-generated-fuel-filter-product",
    imageAltEn: "Torquelis fuel filter product",
    imageAltZhCn: "拓擎利燃油滤清器产品",
    kind: "image" as const,
    mimeType: "image/png",
    originalFilename: "fuel-filter-product.png",
    publicPath: "/assets/fuel-filter-product.png",
    source: "generated" as const,
    storageFilename: "fuel-filter-product.png",
  },
] as const;

export async function resetDemoAssetRecords(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.asset.deleteMany({ where: { source: "uploaded" } });
    await transaction.asset.createMany({
      data: [...standardGeneratedAssets],
      skipDuplicates: true,
    });
  });
}

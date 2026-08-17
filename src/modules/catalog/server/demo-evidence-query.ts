import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";

export async function readCatalogDemoEvidence() {
  const prisma = getApplicationPrisma();
  const [categories, products, vehicleMakes, vehicleModels, engines, fitments] =
    await Promise.all([
      prisma.productCategory.count(),
      prisma.product.count(),
      prisma.vehicleMake.count(),
      prisma.vehicleModel.count(),
      prisma.engine.count(),
      prisma.productFitment.count(),
    ]);

  return {
    categories,
    engines,
    fitments,
    products,
    vehicleMakes,
    vehicleModels,
  };
}

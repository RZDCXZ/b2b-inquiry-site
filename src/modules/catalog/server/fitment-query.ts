import type { PrismaClient } from "@/src/generated/prisma/client";
import type { VehicleFitmentSelection } from "@/src/modules/catalog/public/fitments";

export type CatalogVehicleFitment = {
  engine: { code: string; id: string };
  make: { id: string; name: string };
  model: { id: string; name: string };
  publicationId: string;
  yearFrom: number;
  yearTo: number;
};

export async function listCatalogVehicleFitments(
  prisma: PrismaClient,
  publicationId?: string,
): Promise<CatalogVehicleFitment[]> {
  const fitments = await prisma.productFitment.findMany({
    orderBy: [
      { engine: { vehicleModel: { make: { name: "asc" } } } },
      { engine: { vehicleModel: { name: "asc" } } },
      { yearFrom: "asc" },
      { engine: { code: "asc" } },
      { publicationId: "asc" },
    ],
    select: {
      engine: {
        select: {
          code: true,
          id: true,
          vehicleModel: {
            select: {
              id: true,
              make: { select: { id: true, name: true } },
              name: true,
            },
          },
        },
      },
      publicationId: true,
      yearFrom: true,
      yearTo: true,
    },
    where: publicationId ? { publicationId } : undefined,
  });

  return fitments.map((fitment) => ({
    engine: { code: fitment.engine.code, id: fitment.engine.id },
    make: fitment.engine.vehicleModel.make,
    model: {
      id: fitment.engine.vehicleModel.id,
      name: fitment.engine.vehicleModel.name,
    },
    publicationId: fitment.publicationId,
    yearFrom: fitment.yearFrom,
    yearTo: fitment.yearTo,
  }));
}

export async function findCatalogFitmentPublicationIdsByVehicle(
  prisma: PrismaClient,
  selection: VehicleFitmentSelection,
): Promise<string[]> {
  const fitments = await prisma.productFitment.findMany({
    orderBy: { publicationId: "asc" },
    select: { publicationId: true },
    where: {
      engine: { vehicleModel: { makeId: selection.makeId } },
      engineId: selection.engineId,
      vehicleModelId: selection.modelId,
      yearFrom: { lte: selection.year },
      yearTo: { gte: selection.year },
    },
  });

  return fitments.map(({ publicationId }) => publicationId);
}

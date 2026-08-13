import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";

const vehicleMakes = [
  { id: "make-ardent", name: "Ardent" },
  { id: "make-northline", name: "Northline" },
  { id: "make-voltis", name: "Voltis" },
] as const;

const vehicleModels = [
  { id: "model-ardent-at8", makeId: "make-ardent", name: "AT8" },
  { id: "model-northline-hx7", makeId: "make-northline", name: "HX7" },
  { id: "model-northline-hx9", makeId: "make-northline", name: "HX9" },
  { id: "model-voltis-vx6", makeId: "make-voltis", name: "VX6" },
] as const;

const engines = [
  {
    code: "A11-390",
    id: "engine-a11-390",
    vehicleModelId: "model-ardent-at8",
  },
  {
    code: "N11-360",
    id: "engine-n11-360",
    vehicleModelId: "model-northline-hx7",
  },
  {
    code: "N13-420",
    id: "engine-n13-420",
    vehicleModelId: "model-northline-hx9",
  },
  {
    code: "V9-310",
    id: "engine-v9-310",
    vehicleModelId: "model-voltis-vx6",
  },
] as const;

const productFitments = [
  {
    engineId: "engine-n13-420",
    id: "fitment-tq-af-2106-northline-hx9",
    publicationId: "publication-product-tq-af-2106-v1",
    vehicleModelId: "model-northline-hx9",
    yearFrom: 2019,
    yearTo: 2024,
  },
  {
    engineId: "engine-n11-360",
    id: "fitment-tq-af-2106-northline-hx7",
    publicationId: "publication-product-tq-af-2106-v1",
    vehicleModelId: "model-northline-hx7",
    yearFrom: 2016,
    yearTo: 2021,
  },
  {
    engineId: "engine-a11-390",
    id: "fitment-tq-af-2106-ardent-at8",
    publicationId: "publication-product-tq-af-2106-v1",
    vehicleModelId: "model-ardent-at8",
    yearFrom: 2020,
    yearTo: 2025,
  },
  {
    engineId: "engine-n13-420",
    id: "fitment-tq-cf-3021-northline-hx9",
    publicationId: "publication-product-tq-cf-3021-v1",
    vehicleModelId: "model-northline-hx9",
    yearFrom: 2021,
    yearTo: 2024,
  },
  {
    engineId: "engine-v9-310",
    id: "fitment-tq-cf-3021-voltis-vx6",
    publicationId: "publication-product-tq-cf-3021-v1",
    vehicleModelId: "model-voltis-vx6",
    yearFrom: 2018,
    yearTo: 2023,
  },
  {
    engineId: "engine-n13-420",
    id: "fitment-tq-fl-4827-northline-hx9",
    publicationId: "publication-product-tq-fl-4827-v1",
    vehicleModelId: "model-northline-hx9",
    yearFrom: 2019,
    yearTo: 2024,
  },
  {
    engineId: "engine-a11-390",
    id: "fitment-tq-fl-4827-ardent-at8",
    publicationId: "publication-product-tq-fl-4827-v1",
    vehicleModelId: "model-ardent-at8",
    yearFrom: 2020,
    yearTo: 2025,
  },
  {
    engineId: "engine-v9-310",
    id: "fitment-tq-fl-4827-voltis-vx6",
    publicationId: "publication-product-tq-fl-4827-v1",
    vehicleModelId: "model-voltis-vx6",
    yearFrom: 2018,
    yearTo: 2023,
  },
  {
    engineId: "engine-n13-420",
    id: "fitment-tq-of-1038-northline-hx9",
    publicationId: "publication-product-tq-of-1038-v1",
    vehicleModelId: "model-northline-hx9",
    yearFrom: 2019,
    yearTo: 2024,
  },
  {
    engineId: "engine-n11-360",
    id: "fitment-tq-of-1038-northline-hx7",
    publicationId: "publication-product-tq-of-1038-v1",
    vehicleModelId: "model-northline-hx7",
    yearFrom: 2016,
    yearTo: 2021,
  },
] as const;

async function writeVehicleFitmentDemoData(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  for (const make of vehicleMakes) {
    await transaction.vehicleMake.upsert({
      create: make,
      update: make,
      where: { id: make.id },
    });
  }

  for (const model of vehicleModels) {
    await transaction.vehicleModel.upsert({
      create: model,
      update: model,
      where: { id: model.id },
    });
  }

  for (const engine of engines) {
    await transaction.engine.upsert({
      create: engine,
      update: engine,
      where: { id: engine.id },
    });
  }

  await transaction.productFitment.createMany({
    data: [...productFitments],
    skipDuplicates: true,
  });
}

export async function seedVehicleFitmentDemoData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction((transaction) =>
    writeVehicleFitmentDemoData(transaction),
  );
}

export async function replaceVehicleFitmentDemoData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.productFitment.deleteMany();
    await transaction.engine.deleteMany();
    await transaction.vehicleModel.deleteMany();
    await transaction.vehicleMake.deleteMany();
    await writeVehicleFitmentDemoData(transaction);
  });
}

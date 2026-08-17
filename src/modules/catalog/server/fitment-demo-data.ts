import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import { DEMO_PUBLISHED_PRODUCTS } from "@/src/modules/catalog/public/demo-catalog-fixtures";

const vehicleMakes = [
  { id: "make-ardent", name: "Ardent" },
  { id: "make-northline", name: "Northline" },
  { id: "make-voltis", name: "Voltis" },
  { id: "make-calder", name: "Calder" },
  { id: "make-marovia", name: "Marovia" },
  { id: "make-eliston", name: "Eliston" },
] as const;

const vehicleModels = [
  { id: "model-ardent-at8", makeId: "make-ardent", name: "AT8" },
  { id: "model-ardent-at6", makeId: "make-ardent", name: "AT6" },
  { id: "model-northline-hx7", makeId: "make-northline", name: "HX7" },
  { id: "model-northline-hx9", makeId: "make-northline", name: "HX9" },
  { id: "model-voltis-vx6", makeId: "make-voltis", name: "VX6" },
  { id: "model-voltis-vx8", makeId: "make-voltis", name: "VX8" },
  { id: "model-calder-cx7", makeId: "make-calder", name: "CX7" },
  { id: "model-calder-cx9", makeId: "make-calder", name: "CX9" },
  { id: "model-marovia-mr6", makeId: "make-marovia", name: "MR6" },
  { id: "model-marovia-mr8", makeId: "make-marovia", name: "MR8" },
  { id: "model-eliston-et5", makeId: "make-eliston", name: "ET5" },
  { id: "model-eliston-et7", makeId: "make-eliston", name: "ET7" },
] as const;

const engines = [
  {
    code: "A11-390",
    id: "engine-a11-390",
    vehicleModelId: "model-ardent-at8",
  },
  {
    code: "A9-330",
    id: "engine-a9-330",
    vehicleModelId: "model-ardent-at6",
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
  {
    code: "V11-360",
    id: "engine-v11-360",
    vehicleModelId: "model-voltis-vx8",
  },
  {
    code: "C10-350",
    id: "engine-c10-350",
    vehicleModelId: "model-calder-cx7",
  },
  {
    code: "C12-410",
    id: "engine-c12-410",
    vehicleModelId: "model-calder-cx9",
  },
  {
    code: "M8-290",
    id: "engine-m8-290",
    vehicleModelId: "model-marovia-mr6",
  },
  {
    code: "M10-340",
    id: "engine-m10-340",
    vehicleModelId: "model-marovia-mr8",
  },
  {
    code: "E7-260",
    id: "engine-e7-260",
    vehicleModelId: "model-eliston-et5",
  },
  {
    code: "E9-315",
    id: "engine-e9-315",
    vehicleModelId: "model-eliston-et7",
  },
] as const;

const preservedProductFitments = [
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

const preservedProductIds = new Set([
  "product-tq-af-2106",
  "product-tq-cf-3021",
  "product-tq-fl-4827",
  "product-tq-of-1038",
]);
const generatedFitmentTargets = engines.filter(
  ({ vehicleModelId }) => vehicleModelId !== "model-northline-hx9",
);
const generatedProductFitments = DEMO_PUBLISHED_PRODUCTS.filter(
  ({ id }) => !preservedProductIds.has(id),
).flatMap((product, productIndex) => {
  const count = productIndex < 5 ? 4 : 3;
  return Array.from({ length: count }, (_, fitmentIndex) => {
    const target =
      generatedFitmentTargets[
        (productIndex * 3 + fitmentIndex) % generatedFitmentTargets.length
      ]!;
    const yearFrom = 2014 + ((productIndex + fitmentIndex) % 4);
    return {
      engineId: target.id,
      id: `fitment-${product.id}-demo-${fitmentIndex + 1}`,
      publicationId: product.publicationId!,
      vehicleModelId: target.vehicleModelId,
      yearFrom,
      yearTo: yearFrom + 5,
    };
  });
});

const productFitments = [
  ...preservedProductFitments,
  ...generatedProductFitments,
];

async function writeVehicleFitmentDemoData(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  await transaction.$executeRaw`
    SELECT set_config(
      'torquelis.allow_product_publication_mutation',
      'on',
      true
    )
  `;

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
    data: productFitments,
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

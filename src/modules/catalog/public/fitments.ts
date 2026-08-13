import { z } from "zod";

import { PRODUCT_CATEGORY_CODE_SCHEMA } from "@/src/modules/catalog/public/product-identity";

const FITMENT_ID_SCHEMA = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/);

const FITMENT_YEAR_SCHEMA = z.coerce.number().int().min(1900).max(2100);

export const VEHICLE_FINDER_SEARCH_PARAMS_SCHEMA = z.object({
  category: PRODUCT_CATEGORY_CODE_SCHEMA.optional(),
  engine: FITMENT_ID_SCHEMA.optional(),
  finder: z.literal("vehicle").optional(),
  make: FITMENT_ID_SCHEMA.optional(),
  model: FITMENT_ID_SCHEMA.optional(),
  year: FITMENT_YEAR_SCHEMA.optional(),
});

export type VehicleFitmentSelection = {
  categoryCode: z.infer<typeof PRODUCT_CATEGORY_CODE_SCHEMA>;
  engineId: string;
  makeId: string;
  modelId: string;
  year: number;
};

export type LocalizedVehicleFitmentOption = {
  category: {
    code: z.infer<typeof PRODUCT_CATEGORY_CODE_SCHEMA>;
    name: string;
  };
  engine: { code: string; id: string };
  make: { id: string; name: string };
  model: { id: string; name: string };
  yearFrom: number;
  yearTo: number;
};

export type PartialVehicleFitmentSelection = {
  categoryCode?: string;
  engineId?: string;
  makeId?: string;
  modelId?: string;
  year?: number;
};

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function deriveVehicleFitmentOptions(
  fitments: LocalizedVehicleFitmentOption[],
  selection: PartialVehicleFitmentSelection,
) {
  const makes = uniqueById(fitments.map(({ make }) => make));
  const models = uniqueById(
    fitments
      .filter((fitment) => fitment.make.id === selection.makeId)
      .map(({ model }) => model),
  );
  const years = new Set<number>();

  for (const fitment of fitments) {
    if (
      fitment.make.id !== selection.makeId ||
      fitment.model.id !== selection.modelId
    ) {
      continue;
    }

    for (let year = fitment.yearFrom; year <= fitment.yearTo; year += 1) {
      years.add(year);
    }
  }

  const orderedYears = [...years].sort((left, right) => right - left);
  const engines = uniqueById(
    fitments
      .filter(
        (fitment) =>
          fitment.make.id === selection.makeId &&
          fitment.model.id === selection.modelId &&
          selection.year !== undefined &&
          fitment.yearFrom <= selection.year &&
          fitment.yearTo >= selection.year,
      )
      .map(({ engine }) => engine),
  );
  const categories = uniqueById(
    fitments
      .filter(
        (fitment) =>
          fitment.make.id === selection.makeId &&
          fitment.model.id === selection.modelId &&
          fitment.engine.id === selection.engineId &&
          selection.year !== undefined &&
          fitment.yearFrom <= selection.year &&
          fitment.yearTo >= selection.year,
      )
      .map(({ category }) => ({
        id: category.code,
        label: category.name,
      })),
  );
  const valid = {
    category: categories.some(({ id }) => id === selection.categoryCode),
    engine: engines.some(({ id }) => id === selection.engineId),
    make: makes.some(({ id }) => id === selection.makeId),
    model: models.some(({ id }) => id === selection.modelId),
    year: selection.year !== undefined && orderedYears.includes(selection.year),
  };

  return { categories, engines, makes, models, valid, years: orderedYears };
}

export function findSelectedVehicleFitment(
  fitments: LocalizedVehicleFitmentOption[],
  selection: PartialVehicleFitmentSelection,
): LocalizedVehicleFitmentOption | undefined {
  return fitments.find(
    (fitment) =>
      fitment.make.id === selection.makeId &&
      fitment.model.id === selection.modelId &&
      fitment.engine.id === selection.engineId &&
      selection.year !== undefined &&
      fitment.yearFrom <= selection.year &&
      fitment.yearTo >= selection.year,
  );
}

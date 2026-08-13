"use client";

import { ArrowRight, CaretDown } from "@phosphor-icons/react";
import { useId, useState } from "react";

import {
  deriveVehicleFitmentOptions,
  type LocalizedVehicleFitmentOption,
  type PartialVehicleFitmentSelection,
} from "@/src/modules/catalog/public/fitments";
import { getCatalogCopy } from "@/src/modules/content-publishing/public/catalog-copy";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

export type VehicleFinderSelection = PartialVehicleFitmentSelection;

function SelectField({
  disabled,
  label,
  name,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled: boolean;
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  value: string;
}) {
  const selectId = useId();

  return (
    <div className="vehicle-field">
      <label htmlFor={selectId}>{label}</label>
      <span className="select-wrap">
        <select
          disabled={disabled}
          id={selectId}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <CaretDown aria-hidden="true" size={17} weight="bold" />
      </span>
    </div>
  );
}

export function VehicleFinder({
  fitments,
  initialSelection,
  locale,
}: {
  fitments: LocalizedVehicleFitmentOption[];
  initialSelection?: VehicleFinderSelection;
  locale: PublicLocale;
}) {
  const copy = getCatalogCopy(locale);
  const helperId = useId();
  const [makeId, setMakeId] = useState(initialSelection?.makeId ?? "");
  const [modelId, setModelId] = useState(initialSelection?.modelId ?? "");
  const [year, setYear] = useState(
    initialSelection?.year ? String(initialSelection.year) : "",
  );
  const [engineId, setEngineId] = useState(initialSelection?.engineId ?? "");
  const [categoryCode, setCategoryCode] = useState(
    initialSelection?.categoryCode ?? "",
  );

  const { categories, engines, makes, models, valid, years } =
    deriveVehicleFitmentOptions(fitments, {
      categoryCode,
      engineId,
      makeId,
      modelId,
      year: year ? Number(year) : undefined,
    });
  const isComplete =
    valid.make && valid.model && valid.year && valid.engine && valid.category;

  return (
    <form
      action={`/${locale}/products`}
      aria-describedby={helperId}
      className="vehicle-finder"
    >
      <input name="finder" type="hidden" value="vehicle" />
      <SelectField
        disabled={false}
        label={copy.vehicleBrandLabel}
        name="make"
        onChange={(value) => {
          setMakeId(value);
          setModelId("");
          setYear("");
          setEngineId("");
          setCategoryCode("");
        }}
        options={makes.map((make) => ({ label: make.name, value: make.id }))}
        placeholder={copy.vehicleChooseBrand}
        value={makeId}
      />
      <SelectField
        disabled={!valid.make}
        label={copy.vehicleModelLabel}
        name="model"
        onChange={(value) => {
          setModelId(value);
          setYear("");
          setEngineId("");
          setCategoryCode("");
        }}
        options={models.map((model) => ({
          label: model.name,
          value: model.id,
        }))}
        placeholder={copy.vehicleChooseModel}
        value={modelId}
      />
      <SelectField
        disabled={!valid.model}
        label={copy.vehicleYearLabel}
        name="year"
        onChange={(value) => {
          setYear(value);
          setEngineId("");
          setCategoryCode("");
        }}
        options={years.map((value) => ({
          label: String(value),
          value: String(value),
        }))}
        placeholder={copy.vehicleChooseYear}
        value={year}
      />
      <SelectField
        disabled={!valid.year}
        label={copy.vehicleEngineLabel}
        name="engine"
        onChange={(value) => {
          setEngineId(value);
          setCategoryCode("");
        }}
        options={engines.map((engine) => ({
          label: engine.code,
          value: engine.id,
        }))}
        placeholder={copy.vehicleChooseEngine}
        value={engineId}
      />
      <SelectField
        disabled={!valid.engine}
        label={copy.vehicleCategoryLabel}
        name="category"
        onChange={setCategoryCode}
        options={categories.map((category) => ({
          label: category.label,
          value: category.id,
        }))}
        placeholder={copy.vehicleChooseCategory}
        value={categoryCode}
      />
      <button className="primary-button" disabled={!isComplete} type="submit">
        {copy.vehicleSearchAction}
        <ArrowRight aria-hidden="true" size={18} weight="bold" />
      </button>
      <p id={helperId}>{copy.vehicleHelper}</p>
    </form>
  );
}

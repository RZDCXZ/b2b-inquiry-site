"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { type KeyboardEvent, useId, useRef, useState } from "react";

import {
  VehicleFinder,
  type VehicleFinderSelection,
} from "@/src/components/public/vehicle-finder";
import type { LocalizedVehicleFitmentOption } from "@/src/modules/catalog/public/fitments";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

type FinderMode = {
  inputLabel: string;
  label: string;
  placeholder: string;
};

type ProductFinderProps = {
  action: string;
  finderLabel: string;
  helper: string;
  locale: PublicLocale;
  modes: ReadonlyArray<FinderMode>;
  initialMode?: "part" | "specifications" | "vehicle";
  initialVehicleSelection?: VehicleFinderSelection;
  vehicleFitments?: LocalizedVehicleFitmentOption[];
};

export function ProductFinder({
  action,
  finderLabel,
  helper,
  initialMode = "part",
  initialVehicleSelection,
  locale,
  modes,
  vehicleFitments = [],
}: ProductFinderProps) {
  const initialModeIndexes = { part: 0, vehicle: 1, specifications: 2 };
  const [activeIndex, setActiveIndex] = useState(
    initialModeIndexes[initialMode],
  );
  const finderId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function activateTab(index: number, moveFocus = false) {
    setActiveIndex(index);

    if (moveFocus) {
      tabRefs.current[index]?.focus();
    }
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | undefined;

    switch (event.key) {
      case "ArrowLeft":
        nextIndex = (index - 1 + modes.length) % modes.length;
        break;
      case "ArrowRight":
        nextIndex = (index + 1) % modes.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = modes.length - 1;
        break;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      activateTab(nextIndex, true);
    }
  }

  return (
    <div className="search-workbench" id="products">
      <div aria-label={finderLabel} className="search-tabs" role="tablist">
        {modes.map((mode, index) => (
          <button
            aria-controls={`${finderId}-panel-${index}`}
            aria-selected={activeIndex === index}
            id={`${finderId}-tab-${index}`}
            key={mode.label}
            onClick={() => activateTab(index)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={activeIndex === index ? 0 : -1}
            type="button"
          >
            {mode.label}
          </button>
        ))}
      </div>
      {modes.map((mode, index) => {
        const panelProps = {
          "aria-labelledby": `${finderId}-tab-${index}`,
          hidden: activeIndex !== index,
          id: `${finderId}-panel-${index}`,
          role: "tabpanel",
        } as const;

        if (index === 1) {
          return (
            <div key={`${finderId}-panel-${index}`} {...panelProps}>
              <VehicleFinder
                fitments={vehicleFitments}
                initialSelection={initialVehicleSelection}
                locale={locale}
              />
            </div>
          );
        }

        return (
          <form
            key={`${finderId}-panel-${index}`}
            {...panelProps}
            action={`/${locale}/products`}
            className="search-panel"
          >
            <label>
              <span>{mode.inputLabel}</span>
              <input name="part" placeholder={mode.placeholder} type="search" />
            </label>
            <button className="primary-button" type="submit">
              {action}
              <ArrowRight aria-hidden="true" size={18} weight="bold" />
            </button>
            <p>{helper}</p>
          </form>
        );
      })}
    </div>
  );
}

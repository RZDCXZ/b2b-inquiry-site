"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { type KeyboardEvent, useId, useRef, useState } from "react";

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
};

export function ProductFinder({
  action,
  finderLabel,
  helper,
  initialMode = "part",
  locale,
  modes,
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
      {modes.map((mode, index) => (
        <form
          action={`/${locale}/products`}
          aria-labelledby={`${finderId}-tab-${index}`}
          className="search-panel"
          hidden={activeIndex !== index}
          id={`${finderId}-panel-${index}`}
          key={mode.label}
          role="tabpanel"
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
      ))}
    </div>
  );
}

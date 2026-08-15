"use client";

import { Check } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const steps = ["上传工作簿", "校验预览", "确认导入", "草稿结果"] as const;
export const PRODUCT_IMPORT_CONFIRM_START_EVENT =
  "torquelis:product-import-confirm-start";

export function ProductImportSteps({
  current,
  followConfirmation = false,
}: {
  current: 1 | 2 | 3 | 4;
  followConfirmation?: boolean;
}) {
  const [visibleCurrent, setVisibleCurrent] = useState(current);

  useEffect(() => {
    if (!followConfirmation) return;
    const showConfirmationStep = () => setVisibleCurrent(3);
    window.addEventListener(
      PRODUCT_IMPORT_CONFIRM_START_EVENT,
      showConfirmationStep,
    );
    return () =>
      window.removeEventListener(
        PRODUCT_IMPORT_CONFIRM_START_EVENT,
        showConfirmationStep,
      );
  }, [followConfirmation]);

  return (
    <ol aria-label="导入进度" className="product-import-steps">
      {steps.map((label, index) => {
        const number = (index + 1) as 1 | 2 | 3 | 4;
        const completed = number < visibleCurrent;
        return (
          <li
            aria-current={number === visibleCurrent ? "step" : undefined}
            className={
              number === visibleCurrent
                ? "is-active"
                : completed
                  ? "is-done"
                  : ""
            }
            key={number}
          >
            <span>
              {completed ? <Check aria-hidden="true" /> : String(number)}
            </span>
            <strong>{label}</strong>
          </li>
        );
      })}
    </ol>
  );
}

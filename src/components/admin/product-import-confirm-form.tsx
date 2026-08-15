"use client";

import { Check, CircleNotch } from "@phosphor-icons/react";
import { useFormStatus } from "react-dom";

import { confirmProductImportAction } from "@/app/admin/(protected)/import/actions";
import { PRODUCT_IMPORT_CONFIRM_START_EVENT } from "@/src/components/admin/product-import-steps";

function ConfirmButton({
  disabled,
  disabledLabel,
}: {
  disabled: boolean;
  disabledLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={disabled || pending}
      className="admin-primary-button"
      disabled={disabled || pending}
      title={disabled ? disabledLabel : undefined}
      type="submit"
    >
      {pending ? (
        <CircleNotch aria-hidden="true" className="is-spinning" />
      ) : (
        <Check aria-hidden="true" />
      )}
      {pending ? "正在导入草稿…" : (disabledLabel ?? "确认导入草稿")}
    </button>
  );
}

export function ProductImportConfirmForm({
  disabled,
  disabledLabel,
  previewId,
}: {
  disabled: boolean;
  disabledLabel?: string;
  previewId: string;
}) {
  return (
    <form
      action={confirmProductImportAction}
      className="product-import-confirm-form"
      onSubmit={() =>
        window.dispatchEvent(new Event(PRODUCT_IMPORT_CONFIRM_START_EVENT))
      }
    >
      <input name="previewId" type="hidden" value={previewId} />
      <ConfirmButton disabled={disabled} disabledLabel={disabledLabel} />
    </form>
  );
}

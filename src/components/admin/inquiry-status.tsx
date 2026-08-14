import {
  INQUIRY_STATUS_LABELS_ZH_CN,
  type InquiryStatus as InquiryStatusValue,
} from "@/src/modules/inquiry-operations/public/inquiry-lifecycle";

export function InquiryStatus({ status }: { status: InquiryStatusValue }) {
  const tone =
    status === "pending_assignment" ? "pending" : status.replace("_", "-");

  return (
    <span className={`inquiry-status is-${tone}`}>
      <i /> {INQUIRY_STATUS_LABELS_ZH_CN[status]}
    </span>
  );
}

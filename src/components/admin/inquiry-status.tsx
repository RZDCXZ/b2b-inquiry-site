import type { InquiryStatus as InquiryStatusValue } from "@/src/modules/inquiry-operations/public/inquiry-lifecycle";

const statusLabels: Record<InquiryStatusValue, string> = {
  assigned: "已分配",
  closed: "已关闭",
  in_progress: "跟进中",
  pending_assignment: "待分配",
  quoted: "已报价",
};

export function InquiryStatus({ status }: { status: InquiryStatusValue }) {
  const tone =
    status === "pending_assignment" ? "pending" : status.replace("_", "-");

  return (
    <span className={`inquiry-status is-${tone}`}>
      <i /> {statusLabels[status]}
    </span>
  );
}

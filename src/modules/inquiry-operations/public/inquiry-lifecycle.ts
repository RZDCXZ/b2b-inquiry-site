export const INQUIRY_STATUSES = [
  "pending_assignment",
  "assigned",
  "in_progress",
  "quoted",
  "closed",
] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABELS_ZH_CN: Record<InquiryStatus, string> = {
  assigned: "已分配",
  closed: "已关闭",
  in_progress: "跟进中",
  pending_assignment: "待分配",
  quoted: "已报价",
};

export const INQUIRY_LIFECYCLE_OPERATIONS = [
  "assign",
  "reassign",
  "add_contact",
  "add_quote",
  "add_internal_note",
  "add_correction",
  "close",
  "reopen",
] as const;

export type InquiryLifecycleOperation =
  (typeof INQUIRY_LIFECYCLE_OPERATIONS)[number];

const transitions: Record<
  InquiryStatus,
  Partial<Record<InquiryLifecycleOperation, InquiryStatus>>
> = {
  assigned: {
    add_contact: "in_progress",
    reassign: "assigned",
  },
  closed: { reopen: "assigned" },
  in_progress: {
    add_contact: "in_progress",
    add_correction: "in_progress",
    add_internal_note: "in_progress",
    add_quote: "quoted",
    close: "closed",
    reassign: "in_progress",
  },
  pending_assignment: { assign: "assigned" },
  quoted: {
    add_contact: "quoted",
    add_correction: "quoted",
    add_internal_note: "quoted",
    add_quote: "quoted",
    close: "closed",
    reassign: "quoted",
  },
};

export type InquiryTransition =
  | { allowed: true; status: InquiryStatus }
  | {
      allowed: false;
      code: "INVALID_TRANSITION";
      operation: InquiryLifecycleOperation;
      status: InquiryStatus;
    };

export function transitionInquiryStatus(
  status: InquiryStatus,
  operation: InquiryLifecycleOperation,
): InquiryTransition {
  const nextStatus = transitions[status][operation];

  return nextStatus
    ? { allowed: true, status: nextStatus }
    : { allowed: false, code: "INVALID_TRANSITION", operation, status };
}

import { describe, expect, it } from "vitest";

import {
  INQUIRY_LIFECYCLE_OPERATIONS,
  INQUIRY_STATUSES,
  transitionInquiryStatus,
} from "@/src/modules/inquiry-operations/public/inquiry-lifecycle";

describe("询盘状态机", () => {
  const allowedTransitions = {
    pending_assignment: {
      assign: "assigned",
    },
    assigned: {
      add_contact: "in_progress",
      reassign: "assigned",
    },
    in_progress: {
      add_contact: "in_progress",
      add_correction: "in_progress",
      add_internal_note: "in_progress",
      add_quote: "quoted",
      close: "closed",
      reassign: "in_progress",
    },
    quoted: {
      add_contact: "quoted",
      add_correction: "quoted",
      add_internal_note: "quoted",
      add_quote: "quoted",
      close: "closed",
      reassign: "quoted",
    },
    closed: {
      reopen: "assigned",
    },
  } as const;

  it("返回所有允许操作的下一状态", () => {
    for (const status of INQUIRY_STATUSES) {
      for (const [operation, expectedStatus] of Object.entries(
        allowedTransitions[status],
      )) {
        expect(
          transitionInquiryStatus(
            status,
            operation as (typeof INQUIRY_LIFECYCLE_OPERATIONS)[number],
          ),
          `${status} --${operation}--> ${expectedStatus}`,
        ).toEqual({ allowed: true, status: expectedStatus });
      }
    }
  });

  it("拒绝允许矩阵之外的全部状态操作", () => {
    for (const status of INQUIRY_STATUSES) {
      for (const operation of INQUIRY_LIFECYCLE_OPERATIONS) {
        if (operation in allowedTransitions[status]) {
          continue;
        }

        expect(
          transitionInquiryStatus(status, operation),
          `${status} 不允许 ${operation}`,
        ).toEqual({
          allowed: false,
          code: "INVALID_TRANSITION",
          operation,
          status,
        });
      }
    }
  });
});

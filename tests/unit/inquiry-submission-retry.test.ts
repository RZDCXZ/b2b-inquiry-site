import { describe, expect, it } from "vitest";

import { isRetryableInquirySubmissionConflict } from "@/src/modules/inquiry-operations/server/inquiry-submission-service";

describe("询盘提交事务重试", () => {
  it("重试串行化冲突和同一提交记录的唯一约束竞态", () => {
    expect(isRetryableInquirySubmissionConflict({ code: "P2034" })).toBe(true);
    expect(
      isRetryableInquirySubmissionConflict({
        code: "P2002",
        message: "Unique constraint failed on the fields: (`submission_id`)",
      }),
    ).toBe(true);
    expect(
      isRetryableInquirySubmissionConflict({
        code: "P2002",
        meta: {
          driverAdapterError: {
            cause: {
              constraint: {
                fields: ["submissionId"],
              },
            },
          },
        },
      }),
    ).toBe(true);
  });

  it("不把其他数据库错误当作询盘提交竞态", () => {
    expect(
      isRetryableInquirySubmissionConflict({
        code: "P2002",
        message: "Unique constraint failed on the fields: (`reference_number`)",
      }),
    ).toBe(false);
    expect(isRetryableInquirySubmissionConflict({ code: "P2025" })).toBe(false);
  });
});

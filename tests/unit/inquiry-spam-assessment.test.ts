import { describe, expect, it } from "vitest";

import { assessInquirySubmissionRisk } from "@/src/modules/inquiry-operations/public/inquiry-spam-assessment";

describe("询盘提交风控", () => {
  it("正常填写且未达到速率限制时进入正常询盘流程", () => {
    expect(
      assessInquirySubmissionRisk({
        honeypot: "",
        issuedAt: new Date("2026-08-14T08:00:00.000Z"),
        message:
          "Please confirm availability for our replacement filter program.",
        now: new Date("2026-08-14T08:00:05.000Z"),
        recentSubmissionCount: 0,
      }),
    ).toEqual({ disposition: "accepted", reasons: [] });
  });

  it("蜜罐有值时进入垃圾询盘隔离区", () => {
    expect(
      assessInquirySubmissionRisk({
        honeypot: "https://spam.example",
        issuedAt: new Date("2026-08-14T08:00:00.000Z"),
        message: "Please send product details.",
        now: new Date("2026-08-14T08:00:05.000Z"),
        recentSubmissionCount: 0,
      }),
    ).toEqual({ disposition: "quarantined", reasons: ["honeypot"] });
  });

  it("填写时间短于三秒时进入垃圾询盘隔离区", () => {
    expect(
      assessInquirySubmissionRisk({
        honeypot: "",
        issuedAt: new Date("2026-08-14T08:00:00.000Z"),
        message: "Please send product details.",
        now: new Date("2026-08-14T08:00:02.999Z"),
        recentSubmissionCount: 0,
      }),
    ).toEqual({
      disposition: "quarantined",
      reasons: ["minimum_fill_time"],
    });
  });

  it("十五分钟内已有四次提交时进入垃圾询盘隔离区", () => {
    expect(
      assessInquirySubmissionRisk({
        honeypot: "",
        issuedAt: new Date("2026-08-14T08:00:00.000Z"),
        message: "Please send product details.",
        now: new Date("2026-08-14T08:00:05.000Z"),
        recentSubmissionCount: 4,
      }),
    ).toEqual({ disposition: "quarantined", reasons: ["rate_limit"] });
  });

  it("留言包含三个链接时按简单风险规则进入垃圾询盘隔离区", () => {
    expect(
      assessInquirySubmissionRisk({
        honeypot: "",
        issuedAt: new Date("2026-08-14T08:00:00.000Z"),
        message:
          "Review https://one.example, http://two.example and https://three.example.",
        now: new Date("2026-08-14T08:00:05.000Z"),
        recentSubmissionCount: 0,
      }),
    ).toEqual({
      disposition: "quarantined",
      reasons: ["suspicious_content"],
    });
  });

  it("留言包含连续十二个重复字符时进入垃圾询盘隔离区", () => {
    expect(
      assessInquirySubmissionRisk({
        honeypot: "",
        issuedAt: new Date("2026-08-14T08:00:00.000Z"),
        message: "Please review aaaaaaaaaaaa before responding.",
        now: new Date("2026-08-14T08:00:05.000Z"),
        recentSubmissionCount: 0,
      }),
    ).toEqual({
      disposition: "quarantined",
      reasons: ["suspicious_content"],
    });
  });
});

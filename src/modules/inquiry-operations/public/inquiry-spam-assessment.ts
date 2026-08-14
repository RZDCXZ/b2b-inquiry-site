export type InquirySpamReason =
  "honeypot" | "minimum_fill_time" | "rate_limit" | "suspicious_content";

export type InquirySpamAssessment =
  | { disposition: "accepted"; reasons: [] }
  | { disposition: "quarantined"; reasons: InquirySpamReason[] };

export const INQUIRY_MINIMUM_FILL_TIME_MS = 3_000;
export const INQUIRY_RATE_LIMIT = 4;

export function assessInquirySubmissionRisk(input: {
  honeypot: string;
  issuedAt: Date;
  message: string;
  now: Date;
  recentSubmissionCount: number;
}): InquirySpamAssessment {
  if (input.honeypot.trim()) {
    return { disposition: "quarantined", reasons: ["honeypot"] };
  }

  if (
    input.now.getTime() - input.issuedAt.getTime() <
    INQUIRY_MINIMUM_FILL_TIME_MS
  ) {
    return { disposition: "quarantined", reasons: ["minimum_fill_time"] };
  }

  if (input.recentSubmissionCount >= INQUIRY_RATE_LIMIT) {
    return { disposition: "quarantined", reasons: ["rate_limit"] };
  }

  const linkCount = input.message.match(/https?:\/\//giu)?.length ?? 0;
  const hasRepeatedRun = /(.)\1{11}/u.test(input.message);

  if (linkCount >= 3 || hasRepeatedRun) {
    return { disposition: "quarantined", reasons: ["suspicious_content"] };
  }

  return { disposition: "accepted", reasons: [] };
}

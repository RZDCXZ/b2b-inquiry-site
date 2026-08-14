import { z } from "zod";

const optionalTrimmedText = (maximumLength: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(maximumLength).optional(),
  );

export const INQUIRY_SUBMISSION_SCHEMA = z.object({
  company: z.string().trim().min(1).max(200),
  contactName: z.string().trim().min(1).max(120),
  countryRegion: z.string().trim().min(1).max(120),
  customPackagingNeeded: z.boolean(),
  expectedQuantity: z.string().trim().min(1).max(120),
  honeypot: z.string().max(500),
  message: z.string().trim().min(10).max(5_000),
  phoneOrWhatsapp: optionalTrimmedText(120),
  privacyConsent: z.literal(true),
  privateLabelNeeded: z.boolean(),
  targetMarket: optionalTrimmedText(160),
  workEmail: z.email().max(320),
});

export const INQUIRY_REFERENCE_SCHEMA = z
  .string()
  .regex(/^TQI(?:-[A-Z2-9]{4}){4}$/u);

export type InquirySubmissionFields = z.infer<typeof INQUIRY_SUBMISSION_SCHEMA>;

export const PUBLIC_INQUIRY_FIELD_NAMES = [
  "contactName",
  "workEmail",
  "company",
  "countryRegion",
  "phoneOrWhatsapp",
  "expectedQuantity",
  "targetMarket",
  "privateLabelNeeded",
  "customPackagingNeeded",
  "message",
  "privacyConsent",
] as const satisfies ReadonlyArray<keyof InquirySubmissionFields>;

export type PublicInquiryFieldName =
  (typeof PUBLIC_INQUIRY_FIELD_NAMES)[number];

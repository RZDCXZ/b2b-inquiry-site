ALTER TABLE "inquiry_submission"
ADD CONSTRAINT "inquiry_submission_completion_consistent"
CHECK (
  (
    "completed_at" IS NULL
    AND "reference_number" IS NULL
    AND "disposition" IS NULL
    AND "client_fingerprint_hash" IS NULL
  )
  OR (
    "completed_at" IS NOT NULL
    AND "reference_number" IS NOT NULL
    AND "disposition" IS NOT NULL
    AND "client_fingerprint_hash" IS NOT NULL
  )
);

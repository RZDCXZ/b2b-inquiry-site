ALTER TYPE "InquiryStatus" ADD VALUE 'in_progress';
ALTER TYPE "InquiryStatus" ADD VALUE 'quoted';
ALTER TYPE "InquiryStatus" ADD VALUE 'closed';

CREATE TYPE "InquiryFollowUpType" AS ENUM (
  'contact',
  'quote',
  'internal_note',
  'correction'
);

CREATE TYPE "InquiryQuoteCurrency" AS ENUM ('USD', 'EUR', 'CNY');
CREATE TYPE "InquiryCloseResult" AS ENUM ('won', 'lost', 'invalid');

ALTER TABLE "inquiry"
ADD COLUMN "next_step_date" DATE,
ADD COLUMN "close_result" "InquiryCloseResult",
ADD COLUMN "closed_at" TIMESTAMP(3);

ALTER TABLE "inquiry" DROP CONSTRAINT "inquiry_assignment_status_consistent";
ALTER TABLE "inquiry"
ADD CONSTRAINT "inquiry_assignment_status_consistent"
CHECK (
  ("status" = 'pending_assignment' AND "current_owner_id" IS NULL)
  OR ("status" IN ('assigned', 'in_progress', 'quoted', 'closed') AND "current_owner_id" IS NOT NULL)
),
ADD CONSTRAINT "inquiry_closure_consistent"
CHECK (
  ("status" = 'closed' AND "close_result" IS NOT NULL AND "closed_at" IS NOT NULL)
  OR ("status" <> 'closed' AND "close_result" IS NULL AND "closed_at" IS NULL)
);

CREATE TABLE "inquiry_follow_up" (
  "id" TEXT NOT NULL,
  "inquiry_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "type" "InquiryFollowUpType" NOT NULL,
  "summary" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "next_step_date" DATE,
  "quote_amount" DECIMAL(18,2),
  "quote_currency" "InquiryQuoteCurrency",
  "quote_valid_until" DATE,
  "correction_of_id" TEXT,
  "status_before" "InquiryStatus" NOT NULL,
  "status_after" "InquiryStatus" NOT NULL,
  "from_version" INTEGER NOT NULL,
  "to_version" INTEGER NOT NULL,
  CONSTRAINT "inquiry_follow_up_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inquiry_follow_up_version_progression"
    CHECK ("to_version" = "from_version" + 1),
  CONSTRAINT "inquiry_follow_up_summary_present"
    CHECK (char_length(btrim("summary")) BETWEEN 2 AND 2000),
  CONSTRAINT "inquiry_follow_up_quote_fields_consistent"
    CHECK (
      ("type" = 'quote' AND "quote_amount" > 0 AND "quote_currency" IS NOT NULL AND "quote_valid_until" IS NOT NULL)
      OR ("type" <> 'quote' AND "quote_amount" IS NULL AND "quote_currency" IS NULL AND "quote_valid_until" IS NULL)
    ),
  CONSTRAINT "inquiry_follow_up_correction_consistent"
    CHECK (
      ("type" = 'correction' AND "correction_of_id" IS NOT NULL AND "correction_of_id" <> "id")
      OR ("type" <> 'correction' AND "correction_of_id" IS NULL)
    )
);

CREATE UNIQUE INDEX "inquiry_follow_up_id_inquiry_id_key"
ON "inquiry_follow_up"("id", "inquiry_id");
CREATE UNIQUE INDEX "inquiry_follow_up_inquiry_id_to_version_key"
ON "inquiry_follow_up"("inquiry_id", "to_version");
CREATE INDEX "inquiry_follow_up_inquiry_id_occurred_at_idx"
ON "inquiry_follow_up"("inquiry_id", "occurred_at");
CREATE INDEX "inquiry_follow_up_actor_user_id_idx"
ON "inquiry_follow_up"("actor_user_id");

ALTER TABLE "inquiry_follow_up"
ADD CONSTRAINT "inquiry_follow_up_inquiry_id_fkey"
FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "inquiry_follow_up_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "inquiry_follow_up_correction_of_id_inquiry_id_fkey"
FOREIGN KEY ("correction_of_id", "inquiry_id") REFERENCES "inquiry_follow_up"("id", "inquiry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inquiry_status_change" (
  "id" TEXT NOT NULL,
  "inquiry_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "from_status" "InquiryStatus" NOT NULL,
  "to_status" "InquiryStatus" NOT NULL,
  "close_result" "InquiryCloseResult",
  "reason" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "from_version" INTEGER NOT NULL,
  "to_version" INTEGER NOT NULL,
  CONSTRAINT "inquiry_status_change_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inquiry_status_change_version_progression"
    CHECK ("to_version" = "from_version" + 1),
  CONSTRAINT "inquiry_status_change_close_result_consistent"
    CHECK (
      ("to_status" = 'closed' AND "close_result" IS NOT NULL)
      OR ("to_status" <> 'closed' AND "close_result" IS NULL)
    ),
  CONSTRAINT "inquiry_status_change_reason_length"
    CHECK ("reason" IS NULL OR char_length(btrim("reason")) BETWEEN 2 AND 1000)
);

CREATE UNIQUE INDEX "inquiry_status_change_inquiry_id_to_version_key"
ON "inquiry_status_change"("inquiry_id", "to_version");
CREATE INDEX "inquiry_status_change_inquiry_id_occurred_at_idx"
ON "inquiry_status_change"("inquiry_id", "occurred_at");
CREATE INDEX "inquiry_status_change_actor_user_id_idx"
ON "inquiry_status_change"("actor_user_id");

ALTER TABLE "inquiry_status_change"
ADD CONSTRAINT "inquiry_status_change_inquiry_id_fkey"
FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "inquiry_status_change_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION reject_immutable_inquiry_history_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR (TG_OP = 'DELETE' AND pg_trigger_depth() = 1) THEN
    RAISE EXCEPTION '% records are immutable', TG_TABLE_NAME;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "inquiry_follow_up_immutable"
BEFORE UPDATE OR DELETE ON "inquiry_follow_up"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_inquiry_history_mutation();

CREATE TRIGGER "inquiry_status_change_immutable"
BEFORE UPDATE OR DELETE ON "inquiry_status_change"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_inquiry_history_mutation();

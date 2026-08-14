CREATE TYPE "InquiryDisposition" AS ENUM ('accepted', 'quarantined');
CREATE TYPE "InquiryInterfaceLanguage" AS ENUM ('en', 'zh_cn');
CREATE TYPE "InquiryStatus" AS ENUM ('pending_assignment');

CREATE TABLE "inquiry_submission" (
  "id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "interface_language" "InquiryInterfaceLanguage" NOT NULL,
  "source_page" TEXT NOT NULL,
  "product_id" TEXT,
  "issued_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "reference_number" TEXT,
  "disposition" "InquiryDisposition",
  "client_fingerprint_hash" TEXT,
  CONSTRAINT "inquiry_submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inquiry" (
  "id" TEXT NOT NULL,
  "reference_number" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "product_id" TEXT,
  "status" "InquiryStatus" NOT NULL DEFAULT 'pending_assignment',
  "contact_name" TEXT NOT NULL,
  "work_email" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "country_region" TEXT NOT NULL,
  "expected_quantity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "phone_or_whatsapp" TEXT,
  "target_market" TEXT,
  "private_label_needed" BOOLEAN NOT NULL,
  "custom_packaging_needed" BOOLEAN NOT NULL,
  "privacy_consent_at" TIMESTAMP(3) NOT NULL,
  "source_page" TEXT NOT NULL,
  "interface_language" "InquiryInterfaceLanguage" NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "inquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quarantined_inquiry" (
  "id" TEXT NOT NULL,
  "reference_number" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "product_id" TEXT,
  "contact_name" TEXT NOT NULL,
  "work_email" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "country_region" TEXT NOT NULL,
  "expected_quantity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "phone_or_whatsapp" TEXT,
  "target_market" TEXT,
  "private_label_needed" BOOLEAN NOT NULL,
  "custom_packaging_needed" BOOLEAN NOT NULL,
  "privacy_consent_at" TIMESTAMP(3) NOT NULL,
  "source_page" TEXT NOT NULL,
  "interface_language" "InquiryInterfaceLanguage" NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL,
  "spam_reasons" TEXT[] NOT NULL,
  CONSTRAINT "quarantined_inquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_outbox_record" (
  "id" TEXT NOT NULL,
  "inquiry_id" TEXT NOT NULL,
  "recipient_role" "AppRole" NOT NULL,
  "template" TEXT NOT NULL,
  "content_preview" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_outbox_record_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inquiry_submission_token_hash_key" ON "inquiry_submission"("token_hash");
CREATE UNIQUE INDEX "inquiry_submission_reference_number_key" ON "inquiry_submission"("reference_number");
CREATE INDEX "inquiry_submission_client_fingerprint_hash_completed_at_idx" ON "inquiry_submission"("client_fingerprint_hash", "completed_at");
CREATE INDEX "inquiry_submission_expires_at_idx" ON "inquiry_submission"("expires_at");
CREATE UNIQUE INDEX "inquiry_reference_number_key" ON "inquiry"("reference_number");
CREATE UNIQUE INDEX "inquiry_submission_id_key" ON "inquiry"("submission_id");
CREATE INDEX "inquiry_status_submitted_at_idx" ON "inquiry"("status", "submitted_at");
CREATE INDEX "inquiry_product_id_idx" ON "inquiry"("product_id");
CREATE UNIQUE INDEX "quarantined_inquiry_reference_number_key" ON "quarantined_inquiry"("reference_number");
CREATE UNIQUE INDEX "quarantined_inquiry_submission_id_key" ON "quarantined_inquiry"("submission_id");
CREATE INDEX "quarantined_inquiry_submitted_at_idx" ON "quarantined_inquiry"("submitted_at");
CREATE INDEX "quarantined_inquiry_product_id_idx" ON "quarantined_inquiry"("product_id");
CREATE UNIQUE INDEX "notification_outbox_record_inquiry_id_key" ON "notification_outbox_record"("inquiry_id");
CREATE INDEX "notification_outbox_record_created_at_idx" ON "notification_outbox_record"("created_at");

ALTER TABLE "inquiry_submission"
ADD CONSTRAINT "inquiry_submission_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inquiry"
ADD CONSTRAINT "inquiry_submission_id_fkey"
FOREIGN KEY ("submission_id") REFERENCES "inquiry_submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "inquiry_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quarantined_inquiry"
ADD CONSTRAINT "quarantined_inquiry_submission_id_fkey"
FOREIGN KEY ("submission_id") REFERENCES "inquiry_submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "quarantined_inquiry_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_outbox_record"
ADD CONSTRAINT "notification_outbox_record_inquiry_id_fkey"
FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

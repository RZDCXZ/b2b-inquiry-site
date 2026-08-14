ALTER TABLE "notification_outbox_record"
ADD COLUMN "inquiry_reference_number" TEXT;

UPDATE "notification_outbox_record" AS outbox
SET "inquiry_reference_number" = inquiry."reference_number"
FROM "inquiry"
WHERE inquiry."id" = outbox."inquiry_id";

ALTER TABLE "notification_outbox_record"
ALTER COLUMN "inquiry_reference_number" SET NOT NULL;

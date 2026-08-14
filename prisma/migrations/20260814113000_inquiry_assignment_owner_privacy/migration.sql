ALTER TYPE "InquiryStatus" ADD VALUE 'assigned';

ALTER TABLE "audit_log"
ADD COLUMN "target_type" TEXT,
ADD COLUMN "target_id" TEXT,
ADD COLUMN "summary" TEXT;

ALTER TABLE "inquiry"
ADD COLUMN "current_owner_id" TEXT,
ADD COLUMN "last_modified_by_user_id" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX "notification_outbox_record_inquiry_id_key";

ALTER TABLE "notification_outbox_record"
ADD COLUMN "recipient_user_id" TEXT;

CREATE TABLE "inquiry_assignment" (
  "id" TEXT NOT NULL,
  "inquiry_id" TEXT NOT NULL,
  "previous_owner_id" TEXT,
  "new_owner_id" TEXT NOT NULL,
  "assigned_by_user_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL,
  "from_version" INTEGER NOT NULL,
  "to_version" INTEGER NOT NULL,
  CONSTRAINT "inquiry_assignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inquiry_current_owner_id_status_submitted_at_idx"
ON "inquiry"("current_owner_id", "status", "submitted_at");
CREATE UNIQUE INDEX "inquiry_assignment_inquiry_id_to_version_key"
ON "inquiry_assignment"("inquiry_id", "to_version");
CREATE INDEX "inquiry_assignment_inquiry_id_assigned_at_idx"
ON "inquiry_assignment"("inquiry_id", "assigned_at");
CREATE INDEX "inquiry_assignment_previous_owner_id_idx"
ON "inquiry_assignment"("previous_owner_id");
CREATE INDEX "inquiry_assignment_new_owner_id_idx"
ON "inquiry_assignment"("new_owner_id");
CREATE INDEX "inquiry_assignment_assigned_by_user_id_idx"
ON "inquiry_assignment"("assigned_by_user_id");
CREATE INDEX "notification_outbox_record_inquiry_id_created_at_idx"
ON "notification_outbox_record"("inquiry_id", "created_at");
CREATE INDEX "notification_outbox_record_recipient_user_id_created_at_idx"
ON "notification_outbox_record"("recipient_user_id", "created_at");

ALTER TABLE "inquiry"
ADD CONSTRAINT "inquiry_current_owner_id_fkey"
FOREIGN KEY ("current_owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "inquiry_last_modified_by_user_id_fkey"
FOREIGN KEY ("last_modified_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "inquiry_assignment_status_consistent"
CHECK (
  ("status" = 'pending_assignment' AND "current_owner_id" IS NULL)
  OR ("status" = 'assigned' AND "current_owner_id" IS NOT NULL)
);

ALTER TABLE "inquiry_assignment"
ADD CONSTRAINT "inquiry_assignment_inquiry_id_fkey"
FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "inquiry_assignment_previous_owner_id_fkey"
FOREIGN KEY ("previous_owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "inquiry_assignment_new_owner_id_fkey"
FOREIGN KEY ("new_owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "inquiry_assignment_assigned_by_user_id_fkey"
FOREIGN KEY ("assigned_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "inquiry_assignment_version_progression"
CHECK ("to_version" = "from_version" + 1);

ALTER TABLE "notification_outbox_record"
ADD CONSTRAINT "notification_outbox_record_recipient_user_id_fkey"
FOREIGN KEY ("recipient_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "notification_outbox_record_sales_recipient_consistent"
CHECK ("recipient_role" <> 'sales' OR "recipient_user_id" IS NOT NULL);

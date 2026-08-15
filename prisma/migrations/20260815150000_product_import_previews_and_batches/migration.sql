CREATE TABLE "product_import_preview" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "original_filename" TEXT NOT NULL,
  "file_hash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "errors" JSONB NOT NULL,
  "added_count" INTEGER NOT NULL,
  "updated_count" INTEGER NOT NULL,
  "affected_product_count" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_import_preview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_import_preview_status_valid" CHECK ("status" IN ('pending', 'confirmed')),
  CONSTRAINT "product_import_preview_counts_nonnegative" CHECK (
    "added_count" >= 0 AND "updated_count" >= 0 AND "affected_product_count" >= 0
  )
);

CREATE INDEX "product_import_preview_created_by_user_id_created_at_idx"
ON "product_import_preview"("created_by_user_id", "created_at");
CREATE INDEX "product_import_preview_status_created_at_idx"
ON "product_import_preview"("status", "created_at");

ALTER TABLE "product_import_preview"
ADD CONSTRAINT "product_import_preview_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "product_import_batch" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "batch_number" SERIAL NOT NULL,
  "preview_id" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "file_hash" TEXT NOT NULL,
  "added_count" INTEGER NOT NULL,
  "updated_count" INTEGER NOT NULL,
  "affected_product_count" INTEGER NOT NULL,
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_import_batch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_import_batch_counts_nonnegative" CHECK (
    "added_count" >= 0 AND "updated_count" >= 0 AND "affected_product_count" >= 0
  )
);

CREATE UNIQUE INDEX "product_import_batch_batch_number_key"
ON "product_import_batch"("batch_number");
CREATE UNIQUE INDEX "product_import_batch_preview_id_key"
ON "product_import_batch"("preview_id");
CREATE INDEX "product_import_batch_created_by_user_id_created_at_idx"
ON "product_import_batch"("created_by_user_id", "created_at");

ALTER TABLE "product_import_batch"
ADD CONSTRAINT "product_import_batch_preview_id_fkey"
FOREIGN KEY ("preview_id") REFERENCES "product_import_preview"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "product_import_batch_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "product_import_batch_item" (
  "batch_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "part_number" TEXT NOT NULL,
  "before_draft_version" INTEGER,
  "after_draft_version" INTEGER NOT NULL,
  "product_was_created" BOOLEAN NOT NULL,

  CONSTRAINT "product_import_batch_item_pkey" PRIMARY KEY ("batch_id", "product_id"),
  CONSTRAINT "product_import_batch_item_versions_valid" CHECK (
    ("before_draft_version" IS NULL AND "product_was_created" = true AND "after_draft_version" = 1)
    OR ("before_draft_version" IS NOT NULL AND "product_was_created" = false AND "after_draft_version" = "before_draft_version" + 1)
  )
);

CREATE INDEX "product_import_batch_item_product_id_idx"
ON "product_import_batch_item"("product_id");

ALTER TABLE "product_import_batch_item"
ADD CONSTRAINT "product_import_batch_item_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "product_import_batch"("id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "product_import_batch_item_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

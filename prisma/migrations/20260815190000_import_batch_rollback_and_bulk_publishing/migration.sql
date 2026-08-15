ALTER TABLE "product_import_batch"
ADD COLUMN "rolled_back_by_user_id" TEXT,
ADD COLUMN "rolled_back_at" TIMESTAMP(3);

ALTER TABLE "product_import_batch_item"
ADD COLUMN "before_draft_snapshot" JSONB,
ADD COLUMN "after_draft_snapshot" JSONB,
ADD COLUMN "publication_id_at_import" TEXT;

ALTER TABLE "product_import_batch_item"
DROP CONSTRAINT "product_import_batch_item_product_id_fkey";

ALTER TABLE "product_import_batch"
ADD CONSTRAINT "product_import_batch_rolled_back_by_user_id_fkey"
FOREIGN KEY ("rolled_back_by_user_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "product_import_batch_rolled_back_by_user_id_idx"
ON "product_import_batch"("rolled_back_by_user_id");

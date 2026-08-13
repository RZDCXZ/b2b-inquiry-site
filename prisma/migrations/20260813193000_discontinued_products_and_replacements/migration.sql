CREATE TYPE "ProductStatus" AS ENUM ('draft', 'published', 'discontinued');

ALTER TABLE "product"
ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN "replacement_product_id" TEXT;

UPDATE "product"
SET "status" = 'published'
WHERE "current_publication_id" IS NOT NULL;

ALTER TABLE "product"
ADD CONSTRAINT "product_replacement_not_self"
CHECK (
  "replacement_product_id" IS NULL
  OR "replacement_product_id" <> "id"
),
ADD CONSTRAINT "product_lifecycle_consistent"
CHECK (
  (
    "status" = 'draft'
    AND "current_publication_id" IS NULL
    AND "replacement_product_id" IS NULL
  )
  OR (
    "status" = 'published'
    AND "current_publication_id" IS NOT NULL
    AND "replacement_product_id" IS NULL
  )
  OR (
    "status" = 'discontinued'
    AND "current_publication_id" IS NOT NULL
  )
);

CREATE INDEX "product_replacement_product_id_idx"
ON "product"("replacement_product_id");

CREATE INDEX "product_status_category_id_idx"
ON "product"("status", "category_id");

ALTER TABLE "product"
ADD CONSTRAINT "product_replacement_product_id_fkey"
FOREIGN KEY ("replacement_product_id") REFERENCES "product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

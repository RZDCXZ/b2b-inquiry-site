ALTER TABLE "product_reference"
ADD COLUMN "publication_id" TEXT;

UPDATE "product_reference" AS reference
SET "publication_id" = product."current_publication_id"
FROM "product" AS product
WHERE reference."product_id" = product."id";

ALTER TABLE "product_reference"
ALTER COLUMN "publication_id" SET NOT NULL;

DROP INDEX "product_reference_product_id_brand_normalized_reference_number_key";

ALTER TABLE "product_reference"
DROP CONSTRAINT "product_reference_product_id_fkey";

ALTER TABLE "product_reference"
DROP COLUMN "product_id";

CREATE UNIQUE INDEX "product_reference_publication_id_brand_normalized_reference_number_key"
ON "product_reference"("publication_id", "brand", "normalized_reference_number");

ALTER TABLE "product_reference"
ADD CONSTRAINT "product_reference_publication_id_fkey"
FOREIGN KEY ("publication_id") REFERENCES "product_publication"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_specification_value"
ADD COLUMN "publication_id" TEXT;

UPDATE "product_specification_value" AS value
SET "publication_id" = product."current_publication_id"
FROM "product" AS product
WHERE value."product_id" = product."id";

ALTER TABLE "product_specification_value"
ALTER COLUMN "publication_id" SET NOT NULL;

ALTER TABLE "product_specification_value"
DROP CONSTRAINT "product_specification_value_product_id_fkey";

ALTER TABLE "product_specification_value"
DROP CONSTRAINT "product_specification_value_pkey";

ALTER TABLE "product_specification_value"
DROP COLUMN "product_id";

ALTER TABLE "product_specification_value"
ADD CONSTRAINT "product_specification_value_pkey"
PRIMARY KEY ("publication_id", "attribute_id");

ALTER TABLE "product_specification_value"
ADD CONSTRAINT "product_specification_value_publication_id_fkey"
FOREIGN KEY ("publication_id") REFERENCES "product_publication"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product" DROP CONSTRAINT "product_current_publication_id_fkey";

CREATE UNIQUE INDEX "product_publication_product_id_id_key"
ON "product_publication"("product_id", "id");

CREATE UNIQUE INDEX "product_id_current_publication_id_key"
ON "product"("id", "current_publication_id");

ALTER TABLE "product" ADD CONSTRAINT "product_current_publication_ownership_fkey"
FOREIGN KEY ("id", "current_publication_id")
REFERENCES "product_publication"("product_id", "id")
ON DELETE NO ACTION ON UPDATE CASCADE;

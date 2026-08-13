ALTER TABLE "product_public_content" RENAME TO "product_publication";

ALTER TABLE "product_publication" ADD COLUMN "id" TEXT;
ALTER TABLE "product_publication" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

UPDATE "product_publication"
SET "id" = 'publication-' || "product_id" || '-v1';

ALTER TABLE "product_publication" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "product_publication" ALTER COLUMN "version" DROP DEFAULT;
ALTER TABLE "product_publication" DROP CONSTRAINT "product_public_content_pkey";
ALTER TABLE "product_publication" ADD CONSTRAINT "product_publication_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "product_publication_product_id_version_key" ON "product_publication"("product_id", "version");

ALTER TABLE "product" ADD COLUMN "current_publication_id" TEXT;

UPDATE "product" AS product
SET "current_publication_id" = publication."id"
FROM "product_publication" AS publication
WHERE publication."product_id" = product."id";

CREATE UNIQUE INDEX "product_current_publication_id_key" ON "product"("current_publication_id");

ALTER TABLE "product" ADD CONSTRAINT "product_current_publication_id_fkey"
FOREIGN KEY ("current_publication_id") REFERENCES "product_publication"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

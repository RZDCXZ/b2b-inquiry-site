-- CreateTable
CREATE TABLE "product_reference" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "normalized_reference_number" TEXT GENERATED ALWAYS AS (upper(regexp_replace("reference_number", '[[:space:]-]+', '', 'g'))) STORED,

    CONSTRAINT "product_reference_brand_not_empty" CHECK (btrim("brand") <> ''),
    CONSTRAINT "product_reference_number_not_empty" CHECK ("normalized_reference_number" <> ''),
    CONSTRAINT "product_reference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_reference_product_id_brand_normalized_reference_number_key" ON "product_reference"("product_id", "brand", "normalized_reference_number");

-- CreateIndex
CREATE INDEX "product_reference_normalized_reference_number_idx" ON "product_reference"("normalized_reference_number");

-- AddForeignKey
ALTER TABLE "product_reference" ADD CONSTRAINT "product_reference_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

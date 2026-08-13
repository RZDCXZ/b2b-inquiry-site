-- CreateTable
CREATE TABLE "product_category" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_zh_cn" TEXT NOT NULL,

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "part_number" TEXT NOT NULL,
    "normalized_part_number" TEXT GENERATED ALWAYS AS (upper(regexp_replace("part_number", '[[:space:]-]+', '', 'g'))) STORED,
    "category_id" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_normalized_part_number_not_empty" CHECK ("normalized_part_number" <> ''),
    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_public_content" (
    "product_id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "slug_en" TEXT NOT NULL,
    "summary_en" TEXT NOT NULL,
    "name_zh_cn" TEXT NOT NULL,
    "slug_zh_cn" TEXT NOT NULL,
    "summary_zh_cn" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_public_content_pkey" PRIMARY KEY ("product_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_category_code_key" ON "product_category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_category_position_key" ON "product_category"("position");

-- CreateIndex
CREATE UNIQUE INDEX "product_normalized_part_number_key" ON "product"("normalized_part_number");

-- CreateIndex
CREATE INDEX "product_category_id_idx" ON "product"("category_id");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_public_content" ADD CONSTRAINT "product_public_content_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

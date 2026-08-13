-- CreateEnum
CREATE TYPE "SpecificationDataType" AS ENUM ('boolean', 'decimal', 'enumeration', 'text');

-- CreateEnum
CREATE TYPE "SpecificationUnit" AS ENUM ('cubic_metre_per_minute', 'kilopascal', 'litre_per_minute', 'micrometre', 'millimetre');

-- CreateTable
CREATE TABLE "specification_attribute_definition" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_zh_cn" TEXT NOT NULL,
    "data_type" "SpecificationDataType" NOT NULL,
    "base_unit" "SpecificationUnit",
    "required" BOOLEAN NOT NULL,
    "filterable" BOOLEAN NOT NULL,

    CONSTRAINT "specification_attribute_definition_type_unit_consistency" CHECK (
        ("data_type" = 'decimal' AND "base_unit" IS NOT NULL)
        OR ("data_type" <> 'decimal' AND "base_unit" IS NULL)
    ),
    CONSTRAINT "specification_attribute_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specification_attribute_option" (
    "attribute_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_zh_cn" TEXT NOT NULL,

    CONSTRAINT "specification_attribute_option_pkey" PRIMARY KEY ("attribute_id", "code")
);

-- CreateTable
CREATE TABLE "product_specification_value" (
    "product_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "decimal_value" DECIMAL(18,6),
    "boolean_value" BOOLEAN,
    "enumeration_value" TEXT,
    "text_value" TEXT,

    CONSTRAINT "product_specification_value_one_typed_value" CHECK (
        num_nonnulls("decimal_value", "boolean_value", "enumeration_value", "text_value") = 1
    ),
    CONSTRAINT "product_specification_value_pkey" PRIMARY KEY ("product_id", "attribute_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specification_attribute_definition_category_id_code_key" ON "specification_attribute_definition"("category_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "specification_attribute_definition_id_data_type_key" ON "specification_attribute_definition"("id", "data_type");

-- CreateIndex
CREATE UNIQUE INDEX "specification_attribute_definition_id_base_unit_key" ON "specification_attribute_definition"("id", "base_unit");

-- CreateIndex
CREATE UNIQUE INDEX "specification_attribute_definition_category_id_position_key" ON "specification_attribute_definition"("category_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "specification_attribute_option_attribute_id_position_key" ON "specification_attribute_option"("attribute_id", "position");

-- CreateIndex
CREATE INDEX "product_specification_value_attribute_id_idx" ON "product_specification_value"("attribute_id");

-- AddForeignKey
ALTER TABLE "specification_attribute_definition" ADD CONSTRAINT "specification_attribute_definition_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specification_attribute_option" ADD CONSTRAINT "specification_attribute_option_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "specification_attribute_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specification_value" ADD CONSTRAINT "product_specification_value_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specification_value" ADD CONSTRAINT "product_specification_value_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "specification_attribute_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

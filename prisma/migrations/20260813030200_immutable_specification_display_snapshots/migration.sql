ALTER TABLE "specification_attribute_definition"
ADD COLUMN "minimum_decimal_value" DECIMAL(18,6),
ADD COLUMN "maximum_decimal_value" DECIMAL(18,6);

UPDATE "specification_attribute_definition"
SET
    "minimum_decimal_value" = 0.01,
    "maximum_decimal_value" = CASE "code"
        WHEN 'rated_air_flow' THEN 100
        WHEN 'filtration_rating' THEN 100
        WHEN 'rated_flow' THEN 100
        WHEN 'bypass_valve_opening_pressure' THEN 1000
        ELSE 5000
    END
WHERE "data_type" = 'decimal';

ALTER TABLE "specification_attribute_definition"
ADD CONSTRAINT "specification_attribute_definition_decimal_range" CHECK (
    ("data_type" = 'decimal'
        AND "minimum_decimal_value" IS NOT NULL
        AND "maximum_decimal_value" IS NOT NULL
        AND "minimum_decimal_value" < "maximum_decimal_value")
    OR ("data_type" <> 'decimal'
        AND "minimum_decimal_value" IS NULL
        AND "maximum_decimal_value" IS NULL)
);

ALTER TABLE "product_specification_value"
ADD COLUMN "attribute_code" TEXT,
ADD COLUMN "position" INTEGER,
ADD COLUMN "name_en" TEXT,
ADD COLUMN "name_zh_cn" TEXT,
ADD COLUMN "data_type" "SpecificationDataType",
ADD COLUMN "base_unit" "SpecificationUnit",
ADD COLUMN "enumeration_label_en" TEXT,
ADD COLUMN "enumeration_label_zh_cn" TEXT;

UPDATE "product_specification_value" AS value
SET
    "attribute_code" = definition."code",
    "position" = definition."position",
    "name_en" = definition."name_en",
    "name_zh_cn" = definition."name_zh_cn",
    "data_type" = definition."data_type",
    "base_unit" = definition."base_unit",
    "enumeration_label_en" = (
        SELECT option."label_en"
        FROM "specification_attribute_option" AS option
        WHERE option."attribute_id" = definition."id"
            AND option."code" = value."enumeration_value"
    ),
    "enumeration_label_zh_cn" = (
        SELECT option."label_zh_cn"
        FROM "specification_attribute_option" AS option
        WHERE option."attribute_id" = definition."id"
            AND option."code" = value."enumeration_value"
    )
FROM "specification_attribute_definition" AS definition
WHERE value."attribute_id" = definition."id";

ALTER TABLE "product_specification_value"
ALTER COLUMN "attribute_code" SET NOT NULL,
ALTER COLUMN "position" SET NOT NULL,
ALTER COLUMN "name_en" SET NOT NULL,
ALTER COLUMN "name_zh_cn" SET NOT NULL,
ALTER COLUMN "data_type" SET NOT NULL,
ADD CONSTRAINT "product_specification_value_snapshot_consistency" CHECK (
    ("data_type" = 'decimal'
        AND "base_unit" IS NOT NULL
        AND "decimal_value" IS NOT NULL)
    OR ("data_type" = 'boolean'
        AND "base_unit" IS NULL
        AND "boolean_value" IS NOT NULL)
    OR ("data_type" = 'enumeration'
        AND "base_unit" IS NULL
        AND "enumeration_value" IS NOT NULL
        AND "enumeration_label_en" IS NOT NULL
        AND "enumeration_label_zh_cn" IS NOT NULL)
    OR ("data_type" = 'text'
        AND "base_unit" IS NULL
        AND "text_value" IS NOT NULL)
);

CREATE UNIQUE INDEX "product_specification_value_publication_id_position_key"
ON "product_specification_value"("publication_id", "position");

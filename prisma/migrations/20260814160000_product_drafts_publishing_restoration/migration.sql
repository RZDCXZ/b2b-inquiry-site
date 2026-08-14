ALTER TABLE "product_publication"
ADD COLUMN "source_draft_version" INTEGER,
ADD COLUMN "category_id" TEXT,
ADD COLUMN "image_path" TEXT NOT NULL DEFAULT '/assets/filter-family.png',
ADD COLUMN "image_alt_en" TEXT NOT NULL DEFAULT 'Product image',
ADD COLUMN "image_alt_zh_cn" TEXT NOT NULL DEFAULT '产品图片',
ADD COLUMN "description_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN "seo_title_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN "seo_description_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN "fitment_summary_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN "description_zh_cn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "seo_title_zh_cn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "seo_description_zh_cn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "fitment_summary_zh_cn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'published',
ADD COLUMN "replacement_product_id" TEXT,
ADD COLUMN "restored_from_publication_id" TEXT,
ADD COLUMN "published_by_user_id" TEXT,
ADD COLUMN "sealed_at" TIMESTAMP(3);

UPDATE "product_publication" AS publication
SET
  "sealed_at" = publication."published_at",
  "source_draft_version" = 1,
  "category_id" = product."category_id",
  "image_path" = product."image_path",
  "image_alt_en" = publication."name_en" || ' product image',
  "image_alt_zh_cn" = publication."name_zh_cn" || '产品图片',
  "description_en" = publication."summary_en",
  "seo_title_en" = publication."name_en" || ' | Torquelis Filters',
  "seo_description_en" = publication."summary_en",
  "fitment_summary_en" = 'Selected commercial vehicle applications.',
  "description_zh_cn" = publication."summary_zh_cn",
  "seo_title_zh_cn" = publication."name_zh_cn" || '｜拓擎利滤清',
  "seo_description_zh_cn" = publication."summary_zh_cn",
  "fitment_summary_zh_cn" = '适用于指定商用车型。',
  "status" = product."status",
  "replacement_product_id" = product."replacement_product_id"
FROM "product" AS product
WHERE product."id" = publication."product_id";

CREATE INDEX "product_publication_category_id_idx"
ON "product_publication"("category_id");
CREATE INDEX "product_publication_replacement_product_id_idx"
ON "product_publication"("replacement_product_id");
CREATE INDEX "product_publication_published_by_user_id_idx"
ON "product_publication"("published_by_user_id");

ALTER TABLE "product_publication"
ADD CONSTRAINT "product_publication_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "product_category"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "product_publication_replacement_product_id_fkey"
FOREIGN KEY ("replacement_product_id") REFERENCES "product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "product_publication_restored_from_publication_id_fkey"
FOREIGN KEY ("restored_from_publication_id") REFERENCES "product_publication"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "product_publication_published_by_user_id_fkey"
FOREIGN KEY ("published_by_user_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "product_publication_public_status" CHECK ("status" <> 'draft');

CREATE TABLE "product_draft" (
  "product_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "last_published_version" INTEGER,
  "category_id" TEXT NOT NULL,
  "image_path" TEXT NOT NULL,
  "image_alt_en" TEXT NOT NULL,
  "image_alt_zh_cn" TEXT NOT NULL,
  "name_en" TEXT NOT NULL,
  "slug_en" TEXT NOT NULL,
  "summary_en" TEXT NOT NULL,
  "description_en" TEXT NOT NULL,
  "seo_title_en" TEXT NOT NULL,
  "seo_description_en" TEXT NOT NULL,
  "fitment_summary_en" TEXT NOT NULL,
  "name_zh_cn" TEXT NOT NULL,
  "slug_zh_cn" TEXT NOT NULL,
  "summary_zh_cn" TEXT NOT NULL,
  "description_zh_cn" TEXT NOT NULL,
  "seo_title_zh_cn" TEXT NOT NULL,
  "seo_description_zh_cn" TEXT NOT NULL,
  "fitment_summary_zh_cn" TEXT NOT NULL,
  "status" "ProductStatus" NOT NULL DEFAULT 'published',
  "replacement_product_id" TEXT,
  "restored_from_publication_id" TEXT,
  "last_modified_by_user_id" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_draft_pkey" PRIMARY KEY ("product_id"),
  CONSTRAINT "product_draft_version_positive" CHECK ("version" > 0),
  CONSTRAINT "product_draft_last_published_version_valid" CHECK (
    "last_published_version" IS NULL OR "last_published_version" <= "version"
  ),
  CONSTRAINT "product_draft_target_status" CHECK ("status" <> 'draft')
);

CREATE INDEX "product_draft_category_id_idx" ON "product_draft"("category_id");
CREATE INDEX "product_draft_replacement_product_id_idx" ON "product_draft"("replacement_product_id");
CREATE INDEX "product_draft_last_modified_by_user_id_idx" ON "product_draft"("last_modified_by_user_id");

ALTER TABLE "product_draft"
ADD CONSTRAINT "product_draft_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "product"("id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "product_draft_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "product_category"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "product_draft_replacement_product_id_fkey"
FOREIGN KEY ("replacement_product_id") REFERENCES "product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "product_draft_restored_from_publication_id_fkey"
FOREIGN KEY ("restored_from_publication_id") REFERENCES "product_publication"("id")
ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "product_draft_last_modified_by_user_id_fkey"
FOREIGN KEY ("last_modified_by_user_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "product_draft_specification_value" (
  "product_id" TEXT NOT NULL,
  "attribute_id" TEXT NOT NULL,
  "attribute_code" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "name_en" TEXT NOT NULL,
  "name_zh_cn" TEXT NOT NULL,
  "data_type" "SpecificationDataType" NOT NULL,
  "base_unit" "SpecificationUnit",
  "decimal_value" DECIMAL(18,6),
  "boolean_value" BOOLEAN,
  "enumeration_value" TEXT,
  "enumeration_label_en" TEXT,
  "enumeration_label_zh_cn" TEXT,
  "text_value" TEXT,

  CONSTRAINT "product_draft_specification_value_pkey" PRIMARY KEY ("product_id", "attribute_id"),
  CONSTRAINT "product_draft_specification_value_snapshot_consistency" CHECK (
    ("data_type" = 'decimal' AND "base_unit" IS NOT NULL AND "decimal_value" IS NOT NULL)
    OR ("data_type" = 'boolean' AND "base_unit" IS NULL AND "boolean_value" IS NOT NULL)
    OR ("data_type" = 'enumeration' AND "base_unit" IS NULL AND "enumeration_value" IS NOT NULL AND "enumeration_label_en" IS NOT NULL AND "enumeration_label_zh_cn" IS NOT NULL)
    OR ("data_type" = 'text' AND "base_unit" IS NULL AND "text_value" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "product_draft_specification_value_product_id_position_key"
ON "product_draft_specification_value"("product_id", "position");
CREATE INDEX "product_draft_specification_value_attribute_id_idx"
ON "product_draft_specification_value"("attribute_id");

ALTER TABLE "product_draft_specification_value"
ADD CONSTRAINT "product_draft_specification_value_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "product_draft"("product_id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "product_draft_specification_value_attribute_id_fkey"
FOREIGN KEY ("attribute_id") REFERENCES "specification_attribute_definition"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "product_draft_reference" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "product_id" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "reference_number" TEXT NOT NULL,
  "normalized_reference_number" TEXT GENERATED ALWAYS AS (upper(regexp_replace("reference_number", '[[:space:]-]+', '', 'g'))) STORED,

  CONSTRAINT "product_draft_reference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_draft_reference_brand_not_empty" CHECK (btrim("brand") <> ''),
  CONSTRAINT "product_draft_reference_number_not_empty" CHECK ("normalized_reference_number" <> '')
);

CREATE UNIQUE INDEX "product_draft_reference_product_id_brand_normalized_reference_number_key"
ON "product_draft_reference"("product_id", "brand", "normalized_reference_number");
CREATE INDEX "product_draft_reference_normalized_reference_number_idx"
ON "product_draft_reference"("normalized_reference_number");

ALTER TABLE "product_draft_reference"
ADD CONSTRAINT "product_draft_reference_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "product_draft"("product_id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "product_draft_fitment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "product_id" TEXT NOT NULL,
  "vehicle_model_id" TEXT NOT NULL,
  "engine_id" TEXT NOT NULL,
  "year_from" INTEGER NOT NULL,
  "year_to" INTEGER NOT NULL,

  CONSTRAINT "product_draft_fitment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_draft_fitment_year_range" CHECK (
    "year_from" BETWEEN 1900 AND 2200
    AND "year_to" BETWEEN 1900 AND 2200
    AND "year_from" <= "year_to"
  )
);

CREATE UNIQUE INDEX "product_draft_fitment_product_id_vehicle_model_id_engine_id_year_key"
ON "product_draft_fitment"("product_id", "vehicle_model_id", "engine_id", "year_from", "year_to");
CREATE INDEX "product_draft_fitment_vehicle_model_id_engine_id_year_idx"
ON "product_draft_fitment"("vehicle_model_id", "engine_id", "year_from", "year_to");

ALTER TABLE "product_draft_fitment"
ADD CONSTRAINT "product_draft_fitment_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "product_draft"("product_id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "product_draft_fitment_engine_id_vehicle_model_id_fkey"
FOREIGN KEY ("engine_id", "vehicle_model_id") REFERENCES "engine"("id", "vehicle_model_id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "product_draft" (
  "product_id", "version", "last_published_version", "category_id", "image_path",
  "image_alt_en", "image_alt_zh_cn", "name_en", "slug_en", "summary_en",
  "description_en", "seo_title_en", "seo_description_en", "fitment_summary_en",
  "name_zh_cn", "slug_zh_cn", "summary_zh_cn", "description_zh_cn",
  "seo_title_zh_cn", "seo_description_zh_cn", "fitment_summary_zh_cn", "status",
  "replacement_product_id", "updated_at"
)
SELECT
  product."id",
  1,
  CASE WHEN publication."id" IS NULL THEN NULL ELSE 1 END,
  product."category_id",
  product."image_path",
  COALESCE(publication."image_alt_en", ''),
  COALESCE(publication."image_alt_zh_cn", ''),
  COALESCE(publication."name_en", ''),
  COALESCE(publication."slug_en", ''),
  COALESCE(publication."summary_en", ''),
  COALESCE(publication."description_en", ''),
  COALESCE(publication."seo_title_en", ''),
  COALESCE(publication."seo_description_en", ''),
  COALESCE(publication."fitment_summary_en", ''),
  COALESCE(publication."name_zh_cn", ''),
  COALESCE(publication."slug_zh_cn", ''),
  COALESCE(publication."summary_zh_cn", ''),
  COALESCE(publication."description_zh_cn", ''),
  COALESCE(publication."seo_title_zh_cn", ''),
  COALESCE(publication."seo_description_zh_cn", ''),
  COALESCE(publication."fitment_summary_zh_cn", ''),
  COALESCE(publication."status", 'published'::"ProductStatus"),
  COALESCE(publication."replacement_product_id", product."replacement_product_id"),
  product."updated_at"
FROM "product" AS product
LEFT JOIN "product_publication" AS publication
  ON publication."id" = product."current_publication_id";

INSERT INTO "product_draft_specification_value" (
  "product_id", "attribute_id", "attribute_code", "position", "name_en", "name_zh_cn",
  "data_type", "base_unit", "decimal_value", "boolean_value", "enumeration_value",
  "enumeration_label_en", "enumeration_label_zh_cn", "text_value"
)
SELECT
  publication."product_id", value."attribute_id", value."attribute_code", value."position",
  value."name_en", value."name_zh_cn", value."data_type", value."base_unit",
  value."decimal_value", value."boolean_value", value."enumeration_value",
  value."enumeration_label_en", value."enumeration_label_zh_cn", value."text_value"
FROM "product_specification_value" AS value
JOIN "product_publication" AS publication ON publication."id" = value."publication_id"
JOIN "product" AS product ON product."id" = publication."product_id"
WHERE product."current_publication_id" = publication."id";

INSERT INTO "product_draft_reference" ("product_id", "brand", "reference_number")
SELECT publication."product_id", reference."brand", reference."reference_number"
FROM "product_reference" AS reference
JOIN "product_publication" AS publication ON publication."id" = reference."publication_id"
JOIN "product" AS product ON product."id" = publication."product_id"
WHERE product."current_publication_id" = publication."id";

INSERT INTO "product_draft_fitment" (
  "product_id", "vehicle_model_id", "engine_id", "year_from", "year_to"
)
SELECT
  publication."product_id", fitment."vehicle_model_id", fitment."engine_id",
  fitment."year_from", fitment."year_to"
FROM "product_fitment" AS fitment
JOIN "product_publication" AS publication ON publication."id" = fitment."publication_id"
JOIN "product" AS product ON product."id" = publication."product_id"
WHERE product."current_publication_id" = publication."id";

CREATE OR REPLACE FUNCTION reject_immutable_product_publication_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW."sealed_at" IS NOT NULL THEN
    RAISE EXCEPTION 'product publications must be constructed before sealing';
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE')
    AND OLD."sealed_at" IS NOT NULL
    AND current_setting('torquelis.allow_product_publication_mutation', true) IS DISTINCT FROM 'on'
  THEN
    RAISE EXCEPTION '% records are immutable after sealing', TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "product_publication_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "product_publication"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_product_publication_update();

CREATE OR REPLACE FUNCTION reject_sealed_product_snapshot_mutation()
RETURNS TRIGGER AS $$
DECLARE
  target_publication_id TEXT;
  publication_is_sealed BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_publication_id := OLD."publication_id";
  ELSE
    target_publication_id := NEW."publication_id";
  END IF;

  SELECT publication."sealed_at" IS NOT NULL
  INTO publication_is_sealed
  FROM "product_publication" AS publication
  WHERE publication."id" = target_publication_id;

  IF publication_is_sealed
    AND current_setting('torquelis.allow_product_publication_mutation', true) IS DISTINCT FROM 'on'
  THEN
    RAISE EXCEPTION '% records are immutable after publication sealing', TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "product_specification_value_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "product_specification_value"
FOR EACH ROW EXECUTE FUNCTION reject_sealed_product_snapshot_mutation();

CREATE TRIGGER "product_reference_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "product_reference"
FOR EACH ROW EXECUTE FUNCTION reject_sealed_product_snapshot_mutation();

CREATE TRIGGER "product_fitment_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "product_fitment"
FOR EACH ROW EXECUTE FUNCTION reject_sealed_product_snapshot_mutation();

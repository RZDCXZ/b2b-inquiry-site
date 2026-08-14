CREATE TYPE "AssetKind" AS ENUM ('image', 'document');
CREATE TYPE "AssetSource" AS ENUM ('generated', 'uploaded');

CREATE TABLE "asset" (
  "id" TEXT NOT NULL,
  "kind" "AssetKind" NOT NULL,
  "source" "AssetSource" NOT NULL DEFAULT 'uploaded',
  "original_filename" TEXT NOT NULL,
  "storage_filename" TEXT NOT NULL,
  "public_path" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "image_alt_en" TEXT,
  "image_alt_zh_cn" TEXT,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "asset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_byte_size_positive" CHECK ("byte_size" > 0),
  CONSTRAINT "asset_storage_filename_safe" CHECK (
    "storage_filename" !~ '[\\/]'
    AND btrim("storage_filename") <> ''
  ),
  CONSTRAINT "asset_kind_mime_consistency" CHECK (
    ("kind" = 'image' AND "mime_type" IN ('image/jpeg', 'image/png', 'image/webp'))
    OR ("kind" = 'document' AND "mime_type" = 'application/pdf')
  ),
  CONSTRAINT "asset_image_alt_text_consistency" CHECK (
    (
      "kind" = 'image'
      AND btrim(COALESCE("image_alt_en", '')) <> ''
      AND btrim(COALESCE("image_alt_zh_cn", '')) <> ''
    )
    OR (
      "kind" = 'document'
      AND "image_alt_en" IS NULL
      AND "image_alt_zh_cn" IS NULL
    )
  )
);

CREATE UNIQUE INDEX "asset_storage_filename_key" ON "asset"("storage_filename");
CREATE UNIQUE INDEX "asset_public_path_key" ON "asset"("public_path");
CREATE INDEX "asset_kind_created_at_idx" ON "asset"("kind", "created_at");
CREATE INDEX "asset_source_idx" ON "asset"("source");
CREATE INDEX "asset_created_by_user_id_idx" ON "asset"("created_by_user_id");

ALTER TABLE "asset"
ADD CONSTRAINT "asset_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "asset" (
  "id", "kind", "source", "original_filename", "storage_filename",
  "public_path", "mime_type", "byte_size", "image_alt_en", "image_alt_zh_cn"
)
VALUES
  (
    'asset-generated-filter-family', 'image', 'generated',
    'filter-family.png', 'filter-family.png', '/assets/filter-family.png',
    'image/png', 1742997, 'Torquelis filter product family', '拓擎利滤清产品系列'
  ),
  (
    'asset-generated-fuel-filter-product', 'image', 'generated',
    'fuel-filter-product.png', 'fuel-filter-product.png', '/assets/fuel-filter-product.png',
    'image/png', 883919, 'Torquelis fuel filter product', '拓擎利燃油滤清器产品'
  );

ALTER TABLE "product_draft"
ADD COLUMN "image_asset_id" TEXT,
ADD COLUMN "document_asset_id" TEXT;

ALTER TABLE "product_publication"
ADD COLUMN "image_asset_id" TEXT,
ADD COLUMN "document_asset_id" TEXT;

UPDATE "product_draft"
SET "image_asset_id" = CASE "image_path"
  WHEN '/assets/filter-family.png' THEN 'asset-generated-filter-family'
  WHEN '/assets/fuel-filter-product.png' THEN 'asset-generated-fuel-filter-product'
  ELSE NULL
END;

SELECT set_config(
  'torquelis.allow_product_publication_mutation',
  'on',
  false
);

UPDATE "product_publication"
SET "image_asset_id" = CASE "image_path"
  WHEN '/assets/filter-family.png' THEN 'asset-generated-filter-family'
  WHEN '/assets/fuel-filter-product.png' THEN 'asset-generated-fuel-filter-product'
  ELSE NULL
END;

CREATE INDEX "product_draft_image_asset_id_idx"
ON "product_draft"("image_asset_id");
CREATE INDEX "product_draft_document_asset_id_idx"
ON "product_draft"("document_asset_id");
CREATE INDEX "product_publication_image_asset_id_idx"
ON "product_publication"("image_asset_id");
CREATE INDEX "product_publication_document_asset_id_idx"
ON "product_publication"("document_asset_id");

ALTER TABLE "product_draft"
ADD CONSTRAINT "product_draft_image_asset_id_fkey"
FOREIGN KEY ("image_asset_id") REFERENCES "asset"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "product_draft_document_asset_id_fkey"
FOREIGN KEY ("document_asset_id") REFERENCES "asset"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_publication"
ADD CONSTRAINT "product_publication_image_asset_id_fkey"
FOREIGN KEY ("image_asset_id") REFERENCES "asset"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "product_publication_document_asset_id_fkey"
FOREIGN KEY ("document_asset_id") REFERENCES "asset"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION reject_published_asset_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "product_publication" AS publication
    WHERE publication."sealed_at" IS NOT NULL
      AND (
        publication."image_asset_id" = OLD."id"
        OR publication."document_asset_id" = OLD."id"
      )
  )
  AND current_setting('torquelis.allow_product_publication_mutation', true) IS DISTINCT FROM 'on'
  THEN
    RAISE EXCEPTION 'assets referenced by sealed publications are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "published_asset_immutable"
BEFORE UPDATE OR DELETE ON "asset"
FOR EACH ROW EXECUTE FUNCTION reject_published_asset_mutation();

SELECT set_config(
  'torquelis.allow_product_publication_mutation',
  'off',
  false
);

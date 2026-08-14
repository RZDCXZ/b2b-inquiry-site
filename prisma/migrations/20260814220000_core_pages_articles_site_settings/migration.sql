CREATE TYPE "ContentLocale" AS ENUM ('en', 'zh_cn');
CREATE TYPE "ContentPublicationStatus" AS ENUM ('published', 'archived');
CREATE TYPE "CorePageKey" AS ENUM (
  'home',
  'private_label',
  'manufacturing_quality',
  'technical_resources',
  'about',
  'contact'
);

ALTER TABLE "site_configuration"
ADD COLUMN "contact_phone" TEXT NOT NULL DEFAULT '+86 000 0000 0000',
ADD COLUMN "address_en" TEXT NOT NULL DEFAULT 'Shanghai, China (fictional demo address)',
ADD COLUMN "address_zh_cn" TEXT NOT NULL DEFAULT '中国上海（虚构演示地址）',
ADD COLUMN "social_links" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "default_seo_title_en" TEXT NOT NULL DEFAULT 'Torquelis Filters',
ADD COLUMN "default_seo_title_zh_cn" TEXT NOT NULL DEFAULT '拓擎利滤清',
ADD COLUMN "default_seo_description_en" TEXT NOT NULL DEFAULT 'Fictional commercial vehicle filtration catalogue and inquiry demo.',
ADD COLUMN "default_seo_description_zh_cn" TEXT NOT NULL DEFAULT '虚构商用车滤清器目录与询盘演示系统。',
ADD COLUMN "notification_recipient_roles" "AppRole"[] NOT NULL DEFAULT ARRAY['administrator']::"AppRole"[],
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "last_modified_by_user_id" TEXT;

ALTER TABLE "site_configuration"
ADD CONSTRAINT "site_configuration_version_positive" CHECK ("version" > 0),
ADD CONSTRAINT "site_configuration_notification_roles_not_empty" CHECK (cardinality("notification_recipient_roles") > 0),
ADD CONSTRAINT "site_configuration_last_modified_by_user_id_fkey"
FOREIGN KEY ("last_modified_by_user_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "site_configuration_last_modified_by_user_id_idx"
ON "site_configuration"("last_modified_by_user_id");

CREATE TABLE "core_page" (
  "key" "CorePageKey" NOT NULL,
  "current_publication_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "core_page_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "core_page_current_publication_id_key"
ON "core_page"("current_publication_id");
CREATE UNIQUE INDEX "core_page_key_current_publication_id_key"
ON "core_page"("key", "current_publication_id");

CREATE TABLE "core_page_draft" (
  "page_key" "CorePageKey" NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "last_published_version" INTEGER,
  "content_en" JSONB NOT NULL,
  "content_zh_cn" JSONB NOT NULL,
  "status" "ContentPublicationStatus" NOT NULL DEFAULT 'published',
  "restored_from_publication_id" TEXT,
  "last_modified_by_user_id" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "core_page_draft_pkey" PRIMARY KEY ("page_key"),
  CONSTRAINT "core_page_draft_version_positive" CHECK ("version" > 0),
  CONSTRAINT "core_page_draft_last_published_version_valid" CHECK (
    "last_published_version" IS NULL OR "last_published_version" <= "version"
  )
);

CREATE INDEX "core_page_draft_restored_from_publication_id_idx"
ON "core_page_draft"("restored_from_publication_id");
CREATE INDEX "core_page_draft_last_modified_by_user_id_idx"
ON "core_page_draft"("last_modified_by_user_id");

CREATE TABLE "core_page_publication" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "page_key" "CorePageKey" NOT NULL,
  "version" INTEGER NOT NULL,
  "source_draft_version" INTEGER NOT NULL,
  "content_en" JSONB NOT NULL,
  "content_zh_cn" JSONB NOT NULL,
  "status" "ContentPublicationStatus" NOT NULL DEFAULT 'published',
  "restored_from_publication_id" TEXT,
  "published_by_user_id" TEXT,
  "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sealed_at" TIMESTAMP(3),
  CONSTRAINT "core_page_publication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "core_page_publication_version_positive" CHECK ("version" > 0),
  CONSTRAINT "core_page_publication_source_version_positive" CHECK ("source_draft_version" > 0)
);

CREATE UNIQUE INDEX "core_page_publication_page_key_version_key"
ON "core_page_publication"("page_key", "version");
CREATE UNIQUE INDEX "core_page_publication_page_key_id_key"
ON "core_page_publication"("page_key", "id");
CREATE INDEX "core_page_publication_published_by_user_id_idx"
ON "core_page_publication"("published_by_user_id");
CREATE INDEX "core_page_publication_restored_from_publication_id_idx"
ON "core_page_publication"("restored_from_publication_id");

ALTER TABLE "core_page_draft"
ADD CONSTRAINT "core_page_draft_page_key_fkey"
FOREIGN KEY ("page_key") REFERENCES "core_page"("key")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "core_page_draft_restored_from_publication_id_fkey"
FOREIGN KEY ("restored_from_publication_id") REFERENCES "core_page_publication"("id")
ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "core_page_draft_last_modified_by_user_id_fkey"
FOREIGN KEY ("last_modified_by_user_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "core_page_publication"
ADD CONSTRAINT "core_page_publication_page_key_fkey"
FOREIGN KEY ("page_key") REFERENCES "core_page"("key")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "core_page_publication_restored_from_publication_id_fkey"
FOREIGN KEY ("restored_from_publication_id") REFERENCES "core_page_publication"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "core_page_publication_published_by_user_id_fkey"
FOREIGN KEY ("published_by_user_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core_page"
ADD CONSTRAINT "core_page_key_current_publication_id_fkey"
FOREIGN KEY ("key", "current_publication_id")
REFERENCES "core_page_publication"("page_key", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "article" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "topic_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "article_topic_key_key" ON "article"("topic_key");

CREATE TABLE "article_draft" (
  "article_id" TEXT NOT NULL,
  "locale" "ContentLocale" NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "last_published_version" INTEGER,
  "current_publication_id" TEXT,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "seo_title" TEXT NOT NULL,
  "seo_description" TEXT NOT NULL,
  "status" "ContentPublicationStatus" NOT NULL DEFAULT 'published',
  "restored_from_publication_id" TEXT,
  "last_modified_by_user_id" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_draft_pkey" PRIMARY KEY ("article_id", "locale"),
  CONSTRAINT "article_draft_version_positive" CHECK ("version" > 0),
  CONSTRAINT "article_draft_last_published_version_valid" CHECK (
    "last_published_version" IS NULL OR "last_published_version" <= "version"
  )
);

CREATE UNIQUE INDEX "article_draft_current_publication_id_key"
ON "article_draft"("current_publication_id");
CREATE UNIQUE INDEX "article_draft_locale_slug_key"
ON "article_draft"("locale", "slug");
CREATE UNIQUE INDEX "article_draft_article_id_locale_current_publication_id_key"
ON "article_draft"("article_id", "locale", "current_publication_id");
CREATE INDEX "article_draft_restored_from_publication_id_idx"
ON "article_draft"("restored_from_publication_id");
CREATE INDEX "article_draft_last_modified_by_user_id_idx"
ON "article_draft"("last_modified_by_user_id");

CREATE TABLE "article_publication" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "article_id" TEXT NOT NULL,
  "locale" "ContentLocale" NOT NULL,
  "version" INTEGER NOT NULL,
  "source_draft_version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "seo_title" TEXT NOT NULL,
  "seo_description" TEXT NOT NULL,
  "status" "ContentPublicationStatus" NOT NULL DEFAULT 'published',
  "restored_from_publication_id" TEXT,
  "published_by_user_id" TEXT,
  "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sealed_at" TIMESTAMP(3),
  CONSTRAINT "article_publication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "article_publication_version_positive" CHECK ("version" > 0),
  CONSTRAINT "article_publication_source_version_positive" CHECK ("source_draft_version" > 0)
);

CREATE UNIQUE INDEX "article_publication_article_id_locale_version_key"
ON "article_publication"("article_id", "locale", "version");
CREATE UNIQUE INDEX "article_publication_article_id_locale_id_key"
ON "article_publication"("article_id", "locale", "id");
CREATE INDEX "article_publication_locale_slug_idx"
ON "article_publication"("locale", "slug");
CREATE INDEX "article_publication_published_by_user_id_idx"
ON "article_publication"("published_by_user_id");
CREATE INDEX "article_publication_restored_from_publication_id_idx"
ON "article_publication"("restored_from_publication_id");

ALTER TABLE "article_draft"
ADD CONSTRAINT "article_draft_article_id_fkey"
FOREIGN KEY ("article_id") REFERENCES "article"("id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "article_draft_restored_from_publication_id_fkey"
FOREIGN KEY ("restored_from_publication_id") REFERENCES "article_publication"("id")
ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "article_draft_last_modified_by_user_id_fkey"
FOREIGN KEY ("last_modified_by_user_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "article_publication"
ADD CONSTRAINT "article_publication_article_id_fkey"
FOREIGN KEY ("article_id") REFERENCES "article"("id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "article_publication_restored_from_publication_id_fkey"
FOREIGN KEY ("restored_from_publication_id") REFERENCES "article_publication"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "article_publication_published_by_user_id_fkey"
FOREIGN KEY ("published_by_user_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "article_draft"
ADD CONSTRAINT "article_draft_current_publication_owner_fkey"
FOREIGN KEY ("article_id", "locale", "current_publication_id")
REFERENCES "article_publication"("article_id", "locale", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION reject_immutable_content_publication_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE')
    AND OLD."sealed_at" IS NOT NULL
    AND current_setting('torquelis.allow_content_publication_mutation', true) IS DISTINCT FROM 'on'
  THEN
    RAISE EXCEPTION '% records are immutable after sealing', TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "core_page_publication_immutable"
BEFORE UPDATE OR DELETE ON "core_page_publication"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_content_publication_mutation();

CREATE TRIGGER "article_publication_immutable"
BEFORE UPDATE OR DELETE ON "article_publication"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_content_publication_mutation();

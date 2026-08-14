ALTER TABLE "article_draft"
ADD COLUMN "current_published_slug" TEXT;

UPDATE "article_draft" AS draft
SET "current_published_slug" = publication."slug"
FROM "article_publication" AS publication
WHERE draft."current_publication_id" = publication."id"
  AND publication."status" = 'published';

CREATE UNIQUE INDEX "article_draft_locale_current_published_slug_key"
ON "article_draft"("locale", "current_published_slug");

CREATE TABLE "environment_identity" (
    "key" TEXT NOT NULL DEFAULT 'primary',
    "database_id" TEXT NOT NULL,
    "environment_marker" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "environment_identity_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "site_configuration" (
    "key" TEXT NOT NULL DEFAULT 'primary',
    "company_name_en" TEXT NOT NULL,
    "company_name_zh_cn" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_configuration_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "environment_identity_database_id_key" ON "environment_identity"("database_id");

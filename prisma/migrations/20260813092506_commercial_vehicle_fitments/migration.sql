-- CreateTable
CREATE TABLE "vehicle_make" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "vehicle_make_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_model" (
    "id" TEXT NOT NULL,
    "make_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "vehicle_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engine" (
    "id" TEXT NOT NULL,
    "vehicle_model_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "engine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_fitment" (
    "id" TEXT NOT NULL,
    "publication_id" TEXT NOT NULL,
    "vehicle_model_id" TEXT NOT NULL,
    "engine_id" TEXT NOT NULL,
    "year_from" INTEGER NOT NULL,
    "year_to" INTEGER NOT NULL,

    CONSTRAINT "product_fitment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_make_name_key" ON "vehicle_make"("name");

-- CreateIndex
CREATE INDEX "vehicle_model_make_id_idx" ON "vehicle_model"("make_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_model_make_id_name_key" ON "vehicle_model"("make_id", "name");

-- CreateIndex
CREATE INDEX "engine_vehicle_model_id_idx" ON "engine"("vehicle_model_id");

-- CreateIndex
CREATE UNIQUE INDEX "engine_vehicle_model_id_code_key" ON "engine"("vehicle_model_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "engine_id_vehicle_model_id_key" ON "engine"("id", "vehicle_model_id");

-- CreateIndex
CREATE INDEX "product_fitment_vehicle_model_id_engine_id_year_from_year_t_idx" ON "product_fitment"("vehicle_model_id", "engine_id", "year_from", "year_to");

-- CreateIndex
CREATE UNIQUE INDEX "product_fitment_publication_id_vehicle_model_id_engine_id_y_key" ON "product_fitment"("publication_id", "vehicle_model_id", "engine_id", "year_from", "year_to");

-- AddForeignKey
ALTER TABLE "vehicle_model" ADD CONSTRAINT "vehicle_model_make_id_fkey" FOREIGN KEY ("make_id") REFERENCES "vehicle_make"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engine" ADD CONSTRAINT "engine_vehicle_model_id_fkey" FOREIGN KEY ("vehicle_model_id") REFERENCES "vehicle_model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_fitment" ADD CONSTRAINT "product_fitment_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "product_publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_fitment" ADD CONSTRAINT "product_fitment_engine_id_vehicle_model_id_fkey" FOREIGN KEY ("engine_id", "vehicle_model_id") REFERENCES "engine"("id", "vehicle_model_id") ON DELETE RESTRICT ON UPDATE CASCADE;

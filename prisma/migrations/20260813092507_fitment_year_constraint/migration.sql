ALTER TABLE "product_fitment"
ADD CONSTRAINT "product_fitment_year_range"
CHECK (
  "year_from" BETWEEN 1900 AND 2100
  AND "year_to" BETWEEN "year_from" AND 2100
);

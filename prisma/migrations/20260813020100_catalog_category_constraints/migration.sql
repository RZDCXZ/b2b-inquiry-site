ALTER TABLE "product_category"
ADD CONSTRAINT "product_category_code_supported"
CHECK ("code" IN ('air', 'oil', 'fuel', 'cabin'));

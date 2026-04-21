-- Convert products.tags, products.images, and reviews.images from comma-separated text to JSON arrays
ALTER TABLE "products" ALTER COLUMN "tags" TYPE jsonb USING
  CASE
    WHEN "tags" IS NULL THEN '[]'::jsonb
    WHEN "tags" = '' THEN '[]'::jsonb
    ELSE to_jsonb(string_to_array("tags", ','))
  END;

ALTER TABLE "products" ALTER COLUMN "images" TYPE jsonb USING
  CASE
    WHEN "images" IS NULL THEN '[]'::jsonb
    WHEN "images" = '' THEN '[]'::jsonb
    ELSE to_jsonb(string_to_array("images", ','))
  END;

ALTER TABLE "reviews" ALTER COLUMN "images" TYPE jsonb USING
  CASE
    WHEN "images" IS NULL THEN '[]'::jsonb
    WHEN "images" = '' THEN '[]'::jsonb
    ELSE to_jsonb(string_to_array("images", ','))
  END;

-- Set default values
ALTER TABLE "products" ALTER COLUMN "tags" SET DEFAULT '[]'::jsonb;
ALTER TABLE "products" ALTER COLUMN "images" SET DEFAULT '[]'::jsonb;
ALTER TABLE "reviews" ALTER COLUMN "images" SET DEFAULT '[]'::jsonb;
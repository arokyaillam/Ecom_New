-- Migration: Add coupon_usages table for per-customer coupon tracking
CREATE TABLE IF NOT EXISTS "coupon_usages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "coupon_id" uuid NOT NULL REFERENCES "coupons"("id"),
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "order_id" uuid NOT NULL REFERENCES "orders"("id"),
  "used_at" timestamp DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id")
);

CREATE INDEX IF NOT EXISTS "coupon_usages_coupon_customer_idx" ON "coupon_usages"("coupon_id", "customer_id");
CREATE INDEX IF NOT EXISTS "coupon_usages_store_id_idx" ON "coupon_usages"("store_id");

-- NOTE: Existing payment_providers rows should be re-encrypted via a one-time script
-- after setting PAYMENT_CONFIG_ENCRYPTION_KEY. The application supports reading
-- legacy plaintext configs alongside encrypted ones during the transition period.

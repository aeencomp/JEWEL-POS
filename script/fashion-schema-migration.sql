-- Safe manual migration for FashionPOS columns (no table drops).
-- Run only if db:push still warns about data loss: psql $DATABASE_URL -f script/fashion-schema-migration.sql

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS style_code text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS returned_quantity integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_earned integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_redeemed integer NOT NULL DEFAULT 0;

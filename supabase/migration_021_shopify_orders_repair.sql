-- Protees Business Manager — Shopify orders schema repair.
--
-- Root cause of "Could not find the 'customer_city' column of
-- 'shopify_orders'": migration_014_shopify_multi_store.sql was sent
-- multiple times but never actually executed against the live database —
-- the code and supabase/schema.sql have been correct this whole time.
--
-- This migration re-states just the shopify_orders columns in one small,
-- fully idempotent file so there's a single obvious thing to run to fix
-- the sync, independent of which earlier migrations did or didn't land.
-- Safe to run any number of times, in any order relative to migration_014.

alter table shopify_orders add column if not exists store_key text references shopify_stores(store_key);
alter table shopify_orders add column if not exists customer_phone text;
alter table shopify_orders add column if not exists customer_city text;

create index if not exists idx_shopify_orders_store on shopify_orders(store_key);

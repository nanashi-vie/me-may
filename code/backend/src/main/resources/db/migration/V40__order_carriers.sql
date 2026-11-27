-- Owner 27/11/2026: an order ships with J&T, Shopee Express or is picked up by the customer.
-- A payment without a receipt image must say why in its note (checked by the service).
UPDATE orders SET shipping_provider='JNT' WHERE shipping_provider='J&T';
ALTER TABLE orders ALTER COLUMN shipping_provider SET DEFAULT 'JNT';
ALTER TABLE orders ADD CONSTRAINT orders_shipping_provider_check CHECK(shipping_provider IN ('JNT','SPX','PICKUP'));

-- Handed-over tracking codes are looked up across orders before a new one is accepted.
CREATE INDEX order_shipments_tracking_code_idx ON order_shipments(tracking_code) WHERE tracking_code IS NOT NULL;

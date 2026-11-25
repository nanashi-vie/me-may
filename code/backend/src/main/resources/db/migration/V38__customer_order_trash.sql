ALTER TABLE customer ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX customer_trash_expiry_idx ON customer(deleted_at,id) WHERE deleted_at IS NOT NULL;
CREATE INDEX order_trash_expiry_idx ON orders(deleted_at,id) WHERE deleted_at IS NOT NULL;

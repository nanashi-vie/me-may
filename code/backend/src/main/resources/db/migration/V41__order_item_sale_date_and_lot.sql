-- Owner 28/11/2026: each book in an order has a sale date (date only, Asia/Ho_Chi_Minh).
-- It starts as the day the book was added and can be corrected later; revenue by day will use it.
ALTER TABLE order_items ADD COLUMN sold_on DATE;
UPDATE order_items SET sold_on=(added_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
ALTER TABLE order_items ALTER COLUMN sold_on SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
ALTER TABLE order_items ALTER COLUMN sold_on SET NOT NULL;
CREATE INDEX order_items_sold_on_idx ON order_items(sold_on);

-- A book from outside the website may name the stock lot it came from (free text, owner's own naming).
ALTER TABLE order_items ADD COLUMN lot_label VARCHAR(60);
ALTER TABLE order_items ADD CONSTRAINT order_items_lot_manual_check CHECK(lot_label IS NULL OR source_type='MANUAL');

ALTER TABLE book_copy ADD COLUMN unit_price_per_kg_vnd BIGINT
 CHECK (unit_price_per_kg_vnd BETWEEN 1 AND 999999999999);

ALTER TABLE order_action_notes
 ADD COLUMN item_id BIGINT,
 ADD COLUMN book_code_snapshot VARCHAR(32),
 ADD COLUMN title_snapshot VARCHAR(300),
 ADD COLUMN quantity_removed BIGINT CHECK(quantity_removed>0),
 ADD CONSTRAINT order_note_item_snapshot CHECK(
  (item_id IS NULL AND title_snapshot IS NULL AND book_code_snapshot IS NULL AND quantity_removed IS NULL)
  OR (item_id IS NOT NULL AND title_snapshot IS NOT NULL AND quantity_removed IS NOT NULL AND quantity_removed>0)
 );

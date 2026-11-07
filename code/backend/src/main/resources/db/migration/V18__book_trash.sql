ALTER TABLE book_copy ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX book_trash_expiry_idx ON book_copy(deleted_at,id) WHERE deleted_at IS NOT NULL;

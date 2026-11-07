ALTER TABLE book_import_item DROP CONSTRAINT book_import_item_book_id_fkey;
ALTER TABLE upload_session DROP CONSTRAINT upload_session_book_id_fkey;
ALTER TABLE book_media ALTER COLUMN book_copy_id DROP NOT NULL;
ALTER TABLE book_media ADD CHECK (book_copy_id IS NOT NULL OR state IN ('UPLOADING','DELETE_PENDING'));

ALTER TABLE book_media DROP CONSTRAINT book_media_role_check;

WITH changed AS (
    UPDATE book_media
    SET role = CASE role WHEN 'INTERNAL_1' THEN 'INSIDE_4' ELSE 'INSIDE_5' END
    WHERE role IN ('INTERNAL_1', 'INTERNAL_2')
    RETURNING book_copy_id
)
UPDATE book_copy SET version = version + 1
WHERE id IN (SELECT book_copy_id FROM changed);

ALTER TABLE book_media ADD CONSTRAINT book_media_role_check
    CHECK (role IN ('FRONT', 'BACK', 'SPINE', 'INSIDE_1', 'INSIDE_2', 'INSIDE_3', 'INSIDE_4', 'INSIDE_5'));
ALTER TABLE book_media DROP COLUMN show_on_product;

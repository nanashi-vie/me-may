CREATE TABLE book_variant (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 book_copy_id BIGINT NOT NULL REFERENCES book_copy(id),
 name VARCHAR(100),
 stock BIGINT NOT NULL CHECK (stock BETWEEN 0 AND 999999),
 sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
 UNIQUE (book_copy_id, sort_order) DEFERRABLE INITIALLY DEFERRED,
 CHECK (name IS NULL OR length(trim(name)) > 0)
);
CREATE UNIQUE INDEX book_variant_name ON book_variant(book_copy_id, lower(trim(name))) WHERE name IS NOT NULL;
INSERT INTO book_variant(book_copy_id, stock, sort_order)
 SELECT id, CASE WHEN availability = 'AVAILABLE' THEN 1 ELSE 0 END, 0 FROM book_copy;

ALTER TABLE book_copy DROP CONSTRAINT book_copy_condition_grade_check;
ALTER TABLE book_copy ADD CONSTRAINT book_copy_condition_grade_check
 CHECK (condition_grade IN ('VERY_GOOD','GOOD','FAIR','HIGH_FRESHNESS','MINOR_FLAWS'));

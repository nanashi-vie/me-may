ALTER TABLE book_copy ADD COLUMN weight_g BIGINT CHECK(weight_g BETWEEN 1 AND 9007199254740991);
ALTER TABLE listing RENAME COLUMN price_vnd TO price_min_vnd;
ALTER TABLE listing ADD COLUMN price_max_vnd BIGINT CHECK(price_max_vnd BETWEEN 1 AND 999999999999);
UPDATE listing SET price_max_vnd=price_min_vnd;
ALTER TABLE listing ADD CONSTRAINT listing_price_range CHECK (
 (price_min_vnd IS NULL AND price_max_vnd IS NULL) OR
 (price_min_vnd IS NOT NULL AND price_max_vnd IS NOT NULL AND price_min_vnd<=price_max_vnd)
);
ALTER TABLE book_media DROP CONSTRAINT book_media_role_check;
UPDATE book_media SET role='INSIDE_1' WHERE role='INSIDE';
ALTER TABLE book_media ADD CONSTRAINT book_media_role_check CHECK(role IN ('FRONT','BACK','SPINE','INSIDE_1','INSIDE_2','INSIDE_3'));

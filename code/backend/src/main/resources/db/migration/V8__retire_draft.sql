UPDATE listing SET publication_status='ARCHIVED' WHERE publication_status='DRAFT';
ALTER TABLE listing DROP CONSTRAINT listing_publication_status_check;
ALTER TABLE listing ALTER COLUMN publication_status SET DEFAULT 'ARCHIVED';
ALTER TABLE listing ADD CONSTRAINT listing_publication_status_check CHECK(publication_status IN ('PUBLISHED','ARCHIVED'));

ALTER TABLE book_media DROP CONSTRAINT book_media_role_check;
ALTER TABLE book_media ADD CONSTRAINT book_media_role_check CHECK (
 role IN ('FRONT','BACK','SPINE','INSIDE_1','INSIDE_2','INSIDE_3','INTERNAL_1','INTERNAL_2')
);
CREATE TABLE book_feature (
 code VARCHAR(32) PRIMARY KEY,
 label VARCHAR(100) NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 sort_order INTEGER NOT NULL CHECK(sort_order >= 0)
);
CREATE TABLE listing_feature (
 listing_id BIGINT NOT NULL REFERENCES listing(id),
 feature_code VARCHAR(32) NOT NULL REFERENCES book_feature(code),
 position SMALLINT NOT NULL CHECK(position BETWEEN 1 AND 3),
 PRIMARY KEY(listing_id,feature_code),
 UNIQUE(listing_id,position)
);
CREATE INDEX listing_feature_code_idx ON listing_feature(feature_code);
INSERT INTO book_feature(code,label,sort_order) VALUES
 ('SOUND','Âm thanh',0),('FLAP','Lật mở',1),('SLIDE','Kéo đẩy',2),
 ('POP_UP','Pop-up',3),('TOUCH','Chạm & cảm nhận',4),('SPIN','Xoay chuyển',5);

ALTER TABLE book_media ADD COLUMN show_on_product BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE book_feature SET label='Sờ chạm/Đục lỗ' WHERE code='TOUCH';
UPDATE book_feature SET active=FALSE WHERE code='SPIN';
INSERT INTO book_feature(code,label,sort_order) VALUES
 ('SEARCH','Tìm kiếm',5),('OTHER_INTERACTION','Tương tác khác',6);

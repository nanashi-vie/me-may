CREATE TABLE flash_sale (
 id INTEGER PRIMARY KEY CHECK(id=1), enabled BOOLEAN NOT NULL DEFAULT FALSE,
 starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, version BIGINT NOT NULL DEFAULT 0,
 CHECK(starts_at IS NULL OR ends_at IS NULL OR starts_at<ends_at),
 CHECK(NOT enabled OR (starts_at IS NOT NULL AND ends_at IS NOT NULL))
);
INSERT INTO flash_sale(id) VALUES (1);
CREATE TABLE flash_sale_item (
 listing_id BIGINT PRIMARY KEY REFERENCES listing(id),
 sale_price_vnd BIGINT NOT NULL CHECK(sale_price_vnd BETWEEN 1 AND 999999999999)
);

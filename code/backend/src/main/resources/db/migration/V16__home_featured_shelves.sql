CREATE TABLE home_featured_config (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0)
);
INSERT INTO home_featured_config (id) VALUES (1);

CREATE TABLE home_featured_item (
 shelf_key VARCHAR(160) NOT NULL,
 position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 9),
 listing_id BIGINT NOT NULL REFERENCES listing(id) ON DELETE CASCADE,
 PRIMARY KEY (shelf_key, position),
 UNIQUE (shelf_key, listing_id)
);
CREATE INDEX home_featured_item_listing ON home_featured_item(listing_id);

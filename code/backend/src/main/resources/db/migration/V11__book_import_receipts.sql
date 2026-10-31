CREATE TABLE book_import_batch (
 id UUID PRIMARY KEY,
 fingerprint CHAR(64) NOT NULL UNIQUE CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 schema_version INTEGER NOT NULL CHECK(schema_version>0),
 owner_id BIGINT NOT NULL REFERENCES admin_user(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 state VARCHAR(16) NOT NULL DEFAULT 'COMMITTED' CHECK(state='COMMITTED')
);
CREATE TABLE book_import_item (
 batch_id UUID NOT NULL REFERENCES book_import_batch(id),
 group_key VARCHAR(50) NOT NULL CHECK(group_key ~ '^[A-Za-z0-9_-]{1,50}$'),
 book_id BIGINT NOT NULL REFERENCES book_copy(id),
 book_code VARCHAR(32) NOT NULL,
 title VARCHAR(300) NOT NULL,
 PRIMARY KEY(batch_id,group_key),
 UNIQUE(batch_id,book_id)
);

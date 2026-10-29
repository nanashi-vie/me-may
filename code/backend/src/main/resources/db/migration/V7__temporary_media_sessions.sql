CREATE TABLE upload_session (
 id UUID PRIMARY KEY, owner_id BIGINT NOT NULL REFERENCES admin_user(id),
 state VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','CONSUMED','CANCELLED')),
 created_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 book_id BIGINT REFERENCES book_copy(id), request_fingerprint VARCHAR(64),
 CHECK(expires_at>created_at), CHECK((state='CONSUMED')=(book_id IS NOT NULL))
);
CREATE INDEX upload_session_expiry ON upload_session(state,expires_at);
CREATE TABLE temporary_media (
 id UUID PRIMARY KEY, session_id UUID NOT NULL REFERENCES upload_session(id),
 state VARCHAR(16) NOT NULL CHECK(state IN ('UPLOADING','READY','DELETE_PENDING')),
 storage_public_id VARCHAR(300) UNIQUE NOT NULL,
 replaces_id UUID REFERENCES temporary_media(id) ON DELETE SET NULL,
 asset_id VARCHAR(200), format VARCHAR(16), bytes BIGINT, width INTEGER, height INTEGER,
 alt VARCHAR(300), source_ref VARCHAR(500), created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
 delete_after TIMESTAMPTZ NOT NULL,
 CHECK(state!='READY' OR (asset_id IS NOT NULL AND format IS NOT NULL AND bytes>0 AND width>0 AND height>0))
);
CREATE UNIQUE INDEX temporary_media_replacement ON temporary_media(replaces_id) WHERE state='UPLOADING';
CREATE INDEX temporary_media_session ON temporary_media(session_id,state);
CREATE INDEX temporary_media_cleanup ON temporary_media(state,delete_after);

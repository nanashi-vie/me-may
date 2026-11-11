CREATE TABLE drive_image_batch (
    id UUID PRIMARY KEY,
    actor_id BIGINT NOT NULL,
    namespace TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('IMPORT','MATCH')),
    session_id UUID REFERENCES upload_session(id),
    book_id BIGINT,
    book_version BIGINT,
    targets JSONB NOT NULL DEFAULT '[]',
    request_key UUID NOT NULL,
    fingerprint TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (state IN ('PENDING','PROCESSING','READY','CONFIRMED','CANCELLED','EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    confirm_key UUID,
    confirm_fingerprint TEXT,
    receipt JSONB,
    UNIQUE(actor_id, request_key),
    CHECK ((session_id IS NULL) <> (book_id IS NULL)),
    CHECK ((book_id IS NULL) = (book_version IS NULL))
);
CREATE TABLE drive_image_batch_item (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES drive_image_batch(id),
    ordinal SMALLINT NOT NULL CHECK (ordinal BETWEEN 0 AND 7),
    file_id TEXT NOT NULL,
    media_id UUID,
    generation_id UUID,
    state TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (state IN ('PENDING','DOWNLOADING','ENCODING','READY','FAILED','CANCELLED')),
    error_code TEXT,
    attempts SMALLINT NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    lease_token UUID,
    lease_until TIMESTAMPTZ,
    input_key TEXT,
    sha256 TEXT,
    source_version TEXT,
    source_bytes BIGINT,
    mime TEXT,
    candidates JSONB NOT NULL DEFAULT '[]',
    admitted BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(batch_id, ordinal),
    UNIQUE(batch_id, file_id),
    CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$')
);
CREATE INDEX drive_batch_pending ON drive_image_batch_item(available_at)
  WHERE state IN ('PENDING','DOWNLOADING');
CREATE INDEX drive_batch_media ON drive_image_batch_item(media_id);

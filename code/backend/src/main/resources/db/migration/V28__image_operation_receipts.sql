CREATE TABLE image_migration_receipt (
    id UUID PRIMARY KEY,
    actor_id BIGINT NOT NULL,
    recipe_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + interval '24 hours')
);

CREATE TABLE image_migration_row (
    id UUID PRIMARY KEY,
    receipt_id UUID NOT NULL REFERENCES image_migration_receipt(id) ON DELETE CASCADE,
    line INTEGER NOT NULL CHECK (line BETWEEN 2 AND 101),
    media_id UUID,
    book_id BIGINT,
    book_code TEXT,
    role TEXT,
    book_version BIGINT,
    file_id TEXT,
    cloud_key TEXT,
    state TEXT NOT NULL CHECK (state IN ('PENDING','DOWNLOADING','QUEUED','PROCESSING','READY','INVALID')),
    error_code TEXT,
    input_id UUID,
    preview_id UUID,
    source_sha256 TEXT,
    source_version TEXT,
    source_mime TEXT,
    source_bytes BIGINT,
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    lease_token UUID,
    lease_until TIMESTAMPTZ,
    UNIQUE(receipt_id,line),
    CHECK ((state IN ('DOWNLOADING','PROCESSING')) = (lease_token IS NOT NULL AND lease_until IS NOT NULL))
);

CREATE INDEX image_migration_work ON image_migration_row(state, available_at);
CREATE INDEX image_migration_input ON image_migration_row(input_id) WHERE input_id IS NOT NULL;
CREATE INDEX image_migration_preview ON image_migration_row(preview_id) WHERE preview_id IS NOT NULL;
CREATE INDEX image_migration_lease ON image_migration_row(lease_token) WHERE lease_token IS NOT NULL;

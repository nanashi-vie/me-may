CREATE TABLE image_migration_apply (
    id UUID PRIMARY KEY,
    receipt_id UUID NOT NULL UNIQUE REFERENCES image_migration_receipt(id),
    actor_id BIGINT NOT NULL,
    request_key UUID NOT NULL,
    digest TEXT NOT NULL,
    selection TEXT NOT NULL,
    recipe_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(actor_id,request_key)
);

CREATE TABLE image_migration_apply_book (
    operation_id UUID NOT NULL REFERENCES image_migration_apply(id),
    book_id BIGINT NOT NULL,
    expected_version BIGINT NOT NULL,
    applied_version BIGINT,
    rollback_version BIGINT,
    state TEXT NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','APPLIED','FAILED','ROLLED_BACK')),
    error_code TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(operation_id,book_id)
);

CREATE TABLE image_migration_apply_item (
    id UUID PRIMARY KEY,
    operation_id UUID NOT NULL,
    book_id BIGINT NOT NULL,
    media_id UUID NOT NULL,
    role TEXT NOT NULL,
    cloud_key TEXT NOT NULL,
    file_id TEXT NOT NULL,
    source_sha256 TEXT NOT NULL,
    source_version TEXT NOT NULL,
    source_mime TEXT NOT NULL,
    source_bytes BIGINT NOT NULL,
    previous_binding JSONB,
    job_id UUID UNIQUE,
    state TEXT NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','DOWNLOADING','QUEUED','FAILED')),
    lease_token UUID,
    lease_until TIMESTAMPTZ,
    error_code TEXT,
    UNIQUE(operation_id,media_id),
    FOREIGN KEY(operation_id,book_id) REFERENCES image_migration_apply_book(operation_id,book_id),
    CHECK ((state='DOWNLOADING') = (lease_token IS NOT NULL AND lease_until IS NOT NULL))
);

CREATE INDEX image_migration_apply_work ON image_migration_apply_book(state,updated_at);
CREATE INDEX image_migration_apply_item_lease ON image_migration_apply_item(lease_token) WHERE lease_token IS NOT NULL;

CREATE TABLE image_migration_rollback (
    actor_id BIGINT NOT NULL,
    request_key UUID NOT NULL,
    operation_id UUID NOT NULL REFERENCES image_migration_apply(id),
    versions TEXT NOT NULL,
    PRIMARY KEY(actor_id,request_key)
);

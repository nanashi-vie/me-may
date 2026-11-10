CREATE TABLE image_recovery_operation (
    id UUID PRIMARY KEY,
    actor_id BIGINT NOT NULL,
    request_key UUID NOT NULL,
    selection TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(actor_id,request_key)
);

CREATE TABLE image_recovery_item (
    id UUID PRIMARY KEY,
    operation_id UUID NOT NULL REFERENCES image_recovery_operation(id),
    media_id UUID NOT NULL,
    generation_id UUID,
    priority INTEGER NOT NULL,
    job_id UUID UNIQUE,
    binding_version BIGINT,
    state TEXT NOT NULL CHECK (state IN ('PENDING','DOWNLOADING','QUEUED','READY','FAILED','SKIPPED')),
    error_code TEXT,
    lease_token UUID,
    lease_until TIMESTAMPTZ,
    CHECK ((state='DOWNLOADING') = (lease_token IS NOT NULL AND lease_until IS NOT NULL)),
    UNIQUE(operation_id,media_id)
);
CREATE UNIQUE INDEX image_recovery_active ON image_recovery_item(generation_id)
    WHERE state IN ('PENDING','DOWNLOADING','QUEUED');
CREATE INDEX image_recovery_work ON image_recovery_item(state,priority);
CREATE INDEX image_recovery_lease ON image_recovery_item(lease_token) WHERE lease_token IS NOT NULL;

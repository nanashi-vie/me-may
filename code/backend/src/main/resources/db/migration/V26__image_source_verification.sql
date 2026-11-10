ALTER TABLE image_generation ADD COLUMN input_sha256 TEXT CHECK (input_sha256 ~ '^[a-f0-9]{64}$');

CREATE TABLE image_source_verification (
    job_id UUID PRIMARY KEY REFERENCES image_job(id) ON DELETE CASCADE,
    actor_id BIGINT NOT NULL,
    request_key UUID NOT NULL,
    file_id TEXT NOT NULL,
    binding_version BIGINT NOT NULL CHECK (binding_version >= 0),
    book_id BIGINT,
    book_version BIGINT,
    UNIQUE (actor_id, request_key),
    CHECK ((book_id IS NULL) = (book_version IS NULL))
);

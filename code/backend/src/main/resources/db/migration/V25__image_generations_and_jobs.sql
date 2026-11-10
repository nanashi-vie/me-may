CREATE TABLE image_asset (
    media_id UUID PRIMARY KEY
);

CREATE TABLE image_recipe (
    version TEXT PRIMARY KEY,
    worker_digest TEXT NOT NULL,
    configuration JSONB NOT NULL
);

CREATE TABLE image_generation (
    id UUID PRIMARY KEY,
    media_id UUID NOT NULL REFERENCES image_asset(media_id),
    recipe_version TEXT NOT NULL REFERENCES image_recipe(version),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    UNIQUE (media_id, id)
);

CREATE TABLE image_variant (
    generation_id UUID NOT NULL REFERENCES image_generation(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    mime TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/webp')),
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    bytes BIGINT NOT NULL CHECK (bytes > 0),
    sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
    PRIMARY KEY (generation_id, name, mime)
);

ALTER TABLE book_media
    ADD COLUMN provider TEXT NOT NULL DEFAULT 'CLOUDINARY' CHECK (provider IN ('CLOUDINARY', 'LOCAL')),
    ADD COLUMN serving_generation UUID,
    ADD CONSTRAINT book_media_image_generation_fk FOREIGN KEY (id, serving_generation)
        REFERENCES image_generation(media_id, id),
    ADD CONSTRAINT book_media_image_provider_check CHECK ((provider = 'LOCAL') = (serving_generation IS NOT NULL));

CREATE TABLE image_source_binding (
    media_id UUID PRIMARY KEY REFERENCES image_asset(media_id),
    file_id TEXT,
    sha256 TEXT CHECK (sha256 ~ '^[a-f0-9]{64}$'),
    source_version TEXT,
    source_bytes BIGINT CHECK (source_bytes > 0),
    mime TEXT,
    status TEXT NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (status IN ('UNVERIFIED', 'VERIFIED', 'SOURCE_MISSING', 'SOURCE_CHANGED', 'ACCESS_ERROR')),
    binding_version BIGINT NOT NULL DEFAULT 0 CHECK (binding_version >= 0),
    verified_at TIMESTAMPTZ,
    CHECK (status <> 'VERIFIED' OR
        (file_id IS NOT NULL AND sha256 IS NOT NULL AND source_bytes IS NOT NULL
         AND mime IS NOT NULL AND verified_at IS NOT NULL))
);

CREATE TABLE image_job (
    id UUID PRIMARY KEY,
    media_id UUID NOT NULL,
    generation_id UUID NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('PROCESS', 'VERIFY', 'MIGRATE', 'REBUILD')),
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'RETRYING', 'READY', 'FAILED', 'CANCELLED')),
    input_key TEXT NOT NULL,
    dedupe_key TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lease_token UUID,
    lease_until TIMESTAMPTZ,
    error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id, generation_id) REFERENCES image_generation(media_id, id),
    CHECK ((status = 'PROCESSING') = (lease_token IS NOT NULL AND lease_until IS NOT NULL)),
    CHECK ((lease_token IS NULL) = (lease_until IS NULL))
);

CREATE UNIQUE INDEX image_job_active_dedupe ON image_job(dedupe_key)
    WHERE status IN ('PENDING', 'PROCESSING', 'RETRYING');
CREATE INDEX image_job_claim_order ON image_job(priority, available_at, created_at)
    WHERE status IN ('PENDING', 'RETRYING');

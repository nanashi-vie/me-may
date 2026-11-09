ALTER TABLE temporary_media
    ADD COLUMN provider TEXT NOT NULL DEFAULT 'CLOUDINARY' CHECK (provider IN ('CLOUDINARY', 'LOCAL')),
    ADD COLUMN generation_id UUID,
    ADD CONSTRAINT temporary_media_generation_fk FOREIGN KEY (id, generation_id)
        REFERENCES image_generation(media_id, id),
    ADD CONSTRAINT temporary_media_generation_provider_check CHECK (provider='LOCAL' OR generation_id IS NULL);

CREATE TABLE local_image_commit (
    media_id UUID PRIMARY KEY,
    actor_id BIGINT NOT NULL,
    book_id BIGINT NOT NULL,
    book_version BIGINT NOT NULL,
    role TEXT NOT NULL,
    request_key UUID NOT NULL,
    UNIQUE(actor_id, request_key)
);

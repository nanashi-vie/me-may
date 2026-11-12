CREATE TABLE hero_banner_config(id INTEGER PRIMARY KEY CHECK(id=1),version BIGINT NOT NULL DEFAULT 0 CHECK(version>=0));
INSERT INTO hero_banner_config(id) VALUES(1);
CREATE TABLE hero_banner_upload(
 media_id UUID PRIMARY KEY REFERENCES image_asset(media_id),
 generation_id UUID NOT NULL UNIQUE REFERENCES image_generation(id),
 job_id UUID NOT NULL UNIQUE REFERENCES image_job(id),
 owner_id BIGINT NOT NULL REFERENCES admin_user(id),
 request_key UUID NOT NULL,
 input_key TEXT NOT NULL CHECK(input_key ~ '^banners/staging/[a-f0-9-]{36}/input$'),
 sha256 TEXT NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP+interval '24 hours'),
 published_at TIMESTAMPTZ,
 UNIQUE(owner_id,request_key)
);
CREATE INDEX hero_banner_expiry ON hero_banner_upload(expires_at);
CREATE TABLE hero_banner_item(
 position INTEGER PRIMARY KEY CHECK(position BETWEEN 0 AND 9),
 media_id UUID NOT NULL UNIQUE REFERENCES hero_banner_upload(media_id),
 alt VARCHAR(300) NOT NULL CHECK(length(btrim(alt))>0)
);

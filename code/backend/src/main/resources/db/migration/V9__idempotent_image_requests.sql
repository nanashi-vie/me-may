ALTER TABLE temporary_media ADD COLUMN request_key UUID;
ALTER TABLE temporary_media ADD COLUMN request_fingerprint VARCHAR(64);
CREATE UNIQUE INDEX temporary_media_request ON temporary_media(session_id,request_key) WHERE state IN ('UPLOADING','READY');

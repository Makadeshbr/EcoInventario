-- TODO: Sem teste — script de migration
CREATE TABLE media (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    asset_id        UUID NOT NULL REFERENCES assets(id),
    storage_key     TEXT NOT NULL,
    storage_bucket  TEXT NOT NULL,
    mime_type       TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    size_bytes      BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
    type            TEXT NOT NULL CHECK (type IN ('before', 'after', 'general')),
    upload_status   TEXT NOT NULL DEFAULT 'pending'
                      CHECK (upload_status IN ('pending', 'uploaded', 'failed')),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_media_asset ON media(asset_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_org ON media(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_upload_status ON media(upload_status) WHERE upload_status = 'pending';

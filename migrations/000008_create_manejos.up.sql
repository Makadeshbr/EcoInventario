-- TODO: Sem teste — script de migration
CREATE TABLE manejos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id),
    asset_id          UUID NOT NULL REFERENCES assets(id),
    description       TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
    before_media_id   UUID REFERENCES media(id),
    after_media_id    UUID REFERENCES media(id),
    status            TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    rejection_reason  TEXT CHECK (char_length(rejection_reason) <= 1000),
    created_by        UUID NOT NULL REFERENCES users(id),
    approved_by       UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_manejos_asset ON manejos(asset_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_manejos_org_status ON manejos(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_manejos_updated_at ON manejos(organization_id, updated_at);

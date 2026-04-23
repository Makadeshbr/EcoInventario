-- TODO: Sem teste — script de migration
CREATE TABLE assets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id),
    asset_type_id     UUID NOT NULL REFERENCES asset_types(id),
    location          GEOGRAPHY(POINT, 4326) NOT NULL,
    gps_accuracy_m    REAL,
    qr_code           TEXT NOT NULL UNIQUE,
    status            TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    version           INTEGER NOT NULL DEFAULT 1,
    parent_id         UUID REFERENCES assets(id),
    rejection_reason  TEXT CHECK (char_length(rejection_reason) <= 1000),
    notes             TEXT CHECK (char_length(notes) <= 2000),
    created_by        UUID NOT NULL REFERENCES users(id),
    approved_by       UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_assets_org ON assets(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_status ON assets(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_location ON assets USING GIST(location);
CREATE INDEX idx_assets_created_by ON assets(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_qr ON assets(qr_code);
CREATE INDEX idx_assets_parent ON assets(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_assets_updated_at ON assets(organization_id, updated_at);

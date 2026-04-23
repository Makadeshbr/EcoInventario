-- TODO: Sem teste — script de migration
CREATE TABLE monitoramentos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id),
    asset_id          UUID NOT NULL REFERENCES assets(id),
    notes             TEXT NOT NULL CHECK (char_length(notes) BETWEEN 1 AND 5000),
    health_status     TEXT NOT NULL CHECK (health_status IN ('healthy', 'warning', 'critical', 'dead')),
    status            TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    rejection_reason  TEXT CHECK (char_length(rejection_reason) <= 1000),
    created_by        UUID NOT NULL REFERENCES users(id),
    approved_by       UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_monitoramentos_asset ON monitoramentos(asset_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_monitoramentos_org_status ON monitoramentos(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_monitoramentos_updated_at ON monitoramentos(organization_id, updated_at);

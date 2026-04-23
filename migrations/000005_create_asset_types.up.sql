-- TODO: Sem teste — script de migration
CREATE TABLE asset_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    description     TEXT CHECK (char_length(description) <= 500),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (organization_id, name)
);

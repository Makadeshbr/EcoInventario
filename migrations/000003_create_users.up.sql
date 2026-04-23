-- TODO: Sem teste — script de migration
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
    email           TEXT NOT NULL CHECK (char_length(email) <= 255),
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('tech', 'admin', 'viewer')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    UNIQUE (email, organization_id)
);

CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email);

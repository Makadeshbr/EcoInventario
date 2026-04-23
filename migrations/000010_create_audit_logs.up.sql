-- TODO: Sem teste — script de migration
-- Tabela append-only: sem updated_at, sem deleted_at.
-- A role da aplicação deve ter apenas INSERT grant nesta tabela.
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    action          TEXT NOT NULL,
    performed_by    UUID NOT NULL,
    changes         JSONB,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_created_at ON audit_logs(organization_id, created_at DESC);

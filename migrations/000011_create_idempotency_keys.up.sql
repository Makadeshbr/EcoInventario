-- TODO: Sem teste — script de migration
CREATE TABLE processed_idempotency_keys (
    idempotency_key UUID PRIMARY KEY,
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    result          JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Limpeza periódica: DELETE WHERE created_at < now() - interval '30 days'
CREATE INDEX idx_idempotency_created ON processed_idempotency_keys(created_at);

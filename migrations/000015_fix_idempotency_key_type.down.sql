-- Revert: volta idempotency_key para UUID.
-- ATENÇÃO: falha se houver chaves no formato composto (não-UUID) cadastradas.
ALTER TABLE processed_idempotency_keys
    ALTER COLUMN idempotency_key TYPE UUID USING idempotency_key::UUID;

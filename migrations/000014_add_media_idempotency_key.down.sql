-- TODO: Sem teste — script de migration
ALTER TABLE media DROP COLUMN IF EXISTS idempotency_key;

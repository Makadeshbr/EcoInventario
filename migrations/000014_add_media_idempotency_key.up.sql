-- TODO: Sem teste — script de migration
ALTER TABLE media ADD COLUMN idempotency_key UUID UNIQUE;

-- TODO: Sem teste — script de migration
-- Pode falhar se já existirem versões com qr_code duplicado (cenário esperado pós-up).
DROP INDEX IF EXISTS idx_assets_qr_unique_root;

ALTER TABLE assets ADD CONSTRAINT assets_qr_code_key UNIQUE (qr_code);

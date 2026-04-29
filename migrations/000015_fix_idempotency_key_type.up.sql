-- Fix: idempotency_key deve ser TEXT, não UUID.
-- O cliente mobile envia chaves compostas como "create-asset-<uuid>",
-- "update-asset-<uuid>-<timestamp>", "submit-asset-<uuid>-<seq>", que não
-- são UUIDs válidos — causando SQLSTATE 22P02 em toda tentativa de sync.
ALTER TABLE processed_idempotency_keys
    ALTER COLUMN idempotency_key TYPE TEXT;

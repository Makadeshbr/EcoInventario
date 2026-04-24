-- TODO: Sem teste — script de migration
-- Corrige o conflito entre qr_code UNIQUE e versionamento de assets.
-- Antes: qr_code era UNIQUE global, impossibilitando múltiplas versões do mesmo ativo físico.
-- Agora: unicidade só na raiz viva da cadeia (parent_id IS NULL); versões derivadas
-- compartilham o qr_code da raiz livremente.
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_qr_code_key;

CREATE UNIQUE INDEX idx_assets_qr_unique_root
    ON assets(qr_code)
    WHERE parent_id IS NULL AND deleted_at IS NULL;

-- TODO: Sem teste — script de migration/seed
-- Org padrão para desenvolvimento local. ON CONFLICT garante idempotência.
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Organização Padrão', 'org-padrao')
ON CONFLICT (slug) DO NOTHING;

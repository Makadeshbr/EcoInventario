-- TODO: Sem teste - rollback de migration.
DROP INDEX IF EXISTS users_email_organization_id_active_key;

ALTER TABLE users
    ADD CONSTRAINT users_email_organization_id_key UNIQUE (email, organization_id);

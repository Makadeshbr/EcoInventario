-- TODO: Sem teste - migration validada por aplicacao no PostgreSQL.
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_email_organization_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_organization_id_active_key
    ON users (email, organization_id)
    WHERE deleted_at IS NULL;

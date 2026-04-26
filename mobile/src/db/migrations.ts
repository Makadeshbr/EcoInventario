import type * as SQLite from 'expo-sqlite';

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS assets (
      id               TEXT PRIMARY KEY,
      organization_id  TEXT NOT NULL,
      asset_type_id    TEXT NOT NULL,
      asset_type_name  TEXT NOT NULL,
      latitude         REAL NOT NULL,
      longitude        REAL NOT NULL,
      gps_accuracy_m   REAL,
      qr_code          TEXT NOT NULL UNIQUE,
      status           TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
      version          INTEGER NOT NULL DEFAULT 1,
      parent_id        TEXT,
      rejection_reason TEXT,
      notes            TEXT,
      created_by       TEXT NOT NULL,
      approved_by      TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      deleted_at       TEXT,
      is_synced        INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS media (
      id               TEXT PRIMARY KEY,
      organization_id  TEXT NOT NULL,
      asset_id         TEXT NOT NULL,
      local_file_path  TEXT NOT NULL,
      storage_key      TEXT,
      mime_type        TEXT NOT NULL,
      size_bytes       INTEGER NOT NULL,
      type             TEXT NOT NULL CHECK (type IN ('before', 'after', 'general')),
      upload_status    TEXT NOT NULL DEFAULT 'pending'
                         CHECK (upload_status IN ('pending', 'uploading', 'uploaded', 'failed')),
      created_by       TEXT NOT NULL,
      created_at       TEXT NOT NULL,
      deleted_at       TEXT
    );

    CREATE TABLE IF NOT EXISTS manejos (
      id               TEXT PRIMARY KEY,
      organization_id  TEXT NOT NULL,
      asset_id         TEXT NOT NULL,
      description      TEXT NOT NULL,
      before_media_id  TEXT,
      after_media_id   TEXT,
      status           TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
      rejection_reason TEXT,
      created_by       TEXT NOT NULL,
      approved_by      TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      deleted_at       TEXT,
      is_synced        INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS monitoramentos (
      id               TEXT PRIMARY KEY,
      organization_id  TEXT NOT NULL,
      asset_id         TEXT NOT NULL,
      notes            TEXT NOT NULL,
      health_status    TEXT NOT NULL CHECK (health_status IN ('healthy', 'warning', 'critical', 'dead')),
      status           TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
      rejection_reason TEXT,
      created_by       TEXT NOT NULL,
      approved_by      TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      deleted_at       TEXT,
      is_synced        INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id               TEXT PRIMARY KEY,
      idempotency_key  TEXT NOT NULL UNIQUE,
      action           TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
      entity_type      TEXT NOT NULL,
      entity_id        TEXT NOT NULL,
      payload          TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'syncing', 'synced', 'failed', 'conflict')),
      retry_count      INTEGER NOT NULL DEFAULT 0,
      max_retries      INTEGER NOT NULL DEFAULT 5,
      error_message    TEXT,
      created_at       TEXT NOT NULL,
      last_attempt_at  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);

    CREATE TABLE IF NOT EXISTS media_upload_queue (
      id               TEXT PRIMARY KEY,
      idempotency_key  TEXT NOT NULL UNIQUE,
      media_id         TEXT NOT NULL,
      local_file_path  TEXT NOT NULL,
      asset_id         TEXT NOT NULL,
      media_type       TEXT NOT NULL,
      mime_type        TEXT NOT NULL,
      size_bytes       INTEGER NOT NULL,
      status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'uploading', 'uploaded', 'failed')),
      retry_count      INTEGER NOT NULL DEFAULT 0,
      max_retries      INTEGER NOT NULL DEFAULT 3,
      error_message    TEXT,
      created_at       TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_media_upload_status ON media_upload_queue(status);

    CREATE TABLE IF NOT EXISTS sync_metadata (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id              TEXT PRIMARY KEY,
      entity_type     TEXT NOT NULL,
      entity_id       TEXT NOT NULL,
      local_payload   TEXT NOT NULL,
      server_payload  TEXT NOT NULL,
      created_at      TEXT NOT NULL,
      resolved_at     TEXT
    );
  `);
}

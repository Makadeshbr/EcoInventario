# DATABASE.md — Schema Completo

> **Propósito:** Schema exato de todas as tabelas, no PostgreSQL (servidor) e no SQLite (mobile).
> A IA deve usar este arquivo como referência ao gerar migrations, queries, repositories e tipos.

---

## 1. Convenções

- IDs: UUID. No MVP usamos `gen_random_uuid()` no PostgreSQL e `uuidv4()` no mobile.
- Timestamps: `TIMESTAMPTZ` (com timezone). Sempre UTC.
- Soft delete: campo `deleted_at TIMESTAMPTZ NULL`. NULL = ativo, preenchido = deletado.
- Todas as queries devem incluir `AND deleted_at IS NULL` (exceto audit_logs, que não tem soft delete).
- Valores de enum no banco: **lowercase** (`'draft'`, `'pending'`, `'approved'`, `'rejected'`).
- Multi-tenancy: toda entidade tem `organization_id`. Toda query filtra por organização.

---

## 2. PostgreSQL — Schema do Servidor

### 2.1 organizations

```sql
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,       -- URL-friendly identifier
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 users

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
    email           TEXT NOT NULL CHECK (char_length(email) <= 255),
    password_hash   TEXT NOT NULL,            -- Argon2id
    role            TEXT NOT NULL CHECK (role IN ('tech', 'admin', 'viewer')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    UNIQUE (email, organization_id)
);

CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email);
```

### 2.3 refresh_tokens

```sql
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    token_hash  TEXT NOT NULL UNIQUE,         -- SHA-256 hash do token
    family_id   UUID NOT NULL,                -- agrupa tokens da mesma cadeia de rotation
    is_revoked  BOOLEAN NOT NULL DEFAULT false,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);
```

### 2.4 asset_types

```sql
CREATE TABLE asset_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    description     TEXT CHECK (char_length(description) <= 500),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (organization_id, name)
);
```

### 2.5 assets

```sql
CREATE TABLE assets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id),
    asset_type_id     UUID NOT NULL REFERENCES asset_types(id),
    location          GEOGRAPHY(POINT, 4326) NOT NULL,
    gps_accuracy_m    REAL,                    -- precisão GPS em metros
    qr_code           TEXT NOT NULL UNIQUE,
    status            TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    version           INTEGER NOT NULL DEFAULT 1,
    parent_id         UUID REFERENCES assets(id),
    rejection_reason  TEXT CHECK (char_length(rejection_reason) <= 1000),
    notes             TEXT CHECK (char_length(notes) <= 2000),
    created_by        UUID NOT NULL REFERENCES users(id),
    approved_by       UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_assets_org ON assets(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_status ON assets(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_location ON assets USING GIST(location);
CREATE INDEX idx_assets_created_by ON assets(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_qr ON assets(qr_code);
CREATE INDEX idx_assets_parent ON assets(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_assets_updated_at ON assets(organization_id, updated_at);
```

### 2.6 media

```sql
CREATE TABLE media (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    asset_id        UUID NOT NULL REFERENCES assets(id),
    storage_key     TEXT NOT NULL,             -- chave no S3/MinIO (ex: "org-123/assets/abc/photo-1.jpg")
    storage_bucket  TEXT NOT NULL,
    mime_type       TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    size_bytes      BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760), -- max 10MB
    type            TEXT NOT NULL CHECK (type IN ('before', 'after', 'general')),
    upload_status   TEXT NOT NULL DEFAULT 'pending'
                      CHECK (upload_status IN ('pending', 'uploaded', 'failed')),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_media_asset ON media(asset_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_org ON media(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_upload_status ON media(upload_status) WHERE upload_status = 'pending';
```

### 2.7 manejos

```sql
CREATE TABLE manejos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id),
    asset_id          UUID NOT NULL REFERENCES assets(id),
    description       TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
    before_media_id   UUID REFERENCES media(id),
    after_media_id    UUID REFERENCES media(id),
    status            TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    rejection_reason  TEXT CHECK (char_length(rejection_reason) <= 1000),
    created_by        UUID NOT NULL REFERENCES users(id),
    approved_by       UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_manejos_asset ON manejos(asset_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_manejos_org_status ON manejos(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_manejos_updated_at ON manejos(organization_id, updated_at);
```

### 2.8 monitoramentos

```sql
CREATE TABLE monitoramentos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id),
    asset_id          UUID NOT NULL REFERENCES assets(id),
    notes             TEXT NOT NULL CHECK (char_length(notes) BETWEEN 1 AND 5000),
    health_status     TEXT NOT NULL CHECK (health_status IN ('healthy', 'warning', 'critical', 'dead')),
    status            TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    rejection_reason  TEXT CHECK (char_length(rejection_reason) <= 1000),
    created_by        UUID NOT NULL REFERENCES users(id),
    approved_by       UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_monitoramentos_asset ON monitoramentos(asset_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_monitoramentos_org_status ON monitoramentos(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_monitoramentos_updated_at ON monitoramentos(organization_id, updated_at);
```

### 2.9 audit_logs (APPEND-ONLY)

```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    entity_type     TEXT NOT NULL,         -- 'asset', 'manejo', 'monitoramento', 'user', 'media'
    entity_id       UUID NOT NULL,
    action          TEXT NOT NULL,         -- 'create', 'update', 'delete', 'approve', 'reject',
                                          --  'submit', 'login', 'logout', 'upload'
    performed_by    UUID NOT NULL,
    changes         JSONB,                -- { "field": { "old": "x", "new": "y" } }
    metadata        JSONB,                -- { "ip": "...", "user_agent": "...", "gps": {...} }
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SEM updated_at. SEM deleted_at. Append-only.
-- A role da aplicação tem apenas INSERT grant nesta tabela.

CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_created_at ON audit_logs(organization_id, created_at DESC);
```

### 2.10 processed_idempotency_keys

```sql
CREATE TABLE processed_idempotency_keys (
    idempotency_key UUID PRIMARY KEY,
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    result          JSONB NOT NULL,        -- resposta armazenada para replay
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Limpeza periódica: DELETE WHERE created_at < now() - interval '30 days'
CREATE INDEX idx_idempotency_created ON processed_idempotency_keys(created_at);
```

---

## 3. SQLite — Schema do Mobile

> O mobile usa SQLite para persistência offline. O schema espelha o do servidor
> mas com tipos SQLite (TEXT para UUIDs, TEXT para timestamps ISO 8601,
> TEXT para coordenadas JSON, INTEGER para booleans).

### 3.1 assets (local)

```sql
CREATE TABLE IF NOT EXISTS assets (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    asset_type_id   TEXT NOT NULL,
    asset_type_name TEXT NOT NULL,          -- denormalizado para exibição offline
    latitude        REAL NOT NULL,
    longitude       REAL NOT NULL,
    gps_accuracy_m  REAL,
    qr_code         TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    version         INTEGER NOT NULL DEFAULT 1,
    parent_id       TEXT,
    rejection_reason TEXT,
    notes           TEXT,
    created_by      TEXT NOT NULL,
    approved_by     TEXT,
    created_at      TEXT NOT NULL,          -- ISO 8601
    updated_at      TEXT NOT NULL,
    deleted_at      TEXT,
    is_synced       INTEGER NOT NULL DEFAULT 0  -- 0 = pendente, 1 = sincronizado
);
```

### 3.2 media (local)

```sql
CREATE TABLE IF NOT EXISTS media (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    asset_id        TEXT NOT NULL,
    local_file_path TEXT NOT NULL,          -- caminho no filesystem do device
    storage_key     TEXT,                   -- preenchido após upload
    mime_type       TEXT NOT NULL,
    size_bytes      INTEGER NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('before', 'after', 'general')),
    upload_status   TEXT NOT NULL DEFAULT 'pending'
                      CHECK (upload_status IN ('pending', 'uploading', 'uploaded', 'failed')),
    created_by      TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    deleted_at      TEXT
);
```

### 3.3 manejos (local)

```sql
CREATE TABLE IF NOT EXISTS manejos (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    asset_id        TEXT NOT NULL,
    description     TEXT NOT NULL,
    before_media_id TEXT,
    after_media_id  TEXT,
    status          TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_by      TEXT NOT NULL,
    approved_by     TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    deleted_at      TEXT,
    is_synced       INTEGER NOT NULL DEFAULT 0
);
```

### 3.4 monitoramentos (local)

```sql
CREATE TABLE IF NOT EXISTS monitoramentos (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    asset_id        TEXT NOT NULL,
    notes           TEXT NOT NULL,
    health_status   TEXT NOT NULL CHECK (health_status IN ('healthy', 'warning', 'critical', 'dead')),
    status          TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_by      TEXT NOT NULL,
    approved_by     TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    deleted_at      TEXT,
    is_synced       INTEGER NOT NULL DEFAULT 0
);
```

### 3.5 sync_queue (local)

```sql
CREATE TABLE IF NOT EXISTS sync_queue (
    id              TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    action          TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    payload         TEXT NOT NULL,            -- JSON serializado
    status          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'syncing', 'synced', 'failed', 'conflict')),
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 5,
    error_message   TEXT,
    created_at      TEXT NOT NULL,
    last_attempt_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
```

### 3.6 media_upload_queue (local)

```sql
CREATE TABLE IF NOT EXISTS media_upload_queue (
    id              TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    media_id        TEXT NOT NULL,            -- referência ao media local
    local_file_path TEXT NOT NULL,
    asset_id        TEXT NOT NULL,
    media_type      TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    size_bytes      INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'uploading', 'uploaded', 'failed')),
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 3,
    error_message   TEXT,
    created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_upload_status ON media_upload_queue(status);
```

### 3.7 sync_metadata (local)

```sql
-- Controle de sincronização
CREATE TABLE IF NOT EXISTS sync_metadata (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Valores esperados:
-- key = 'last_sync_at', value = ISO 8601 timestamp
-- key = 'last_pull_cursor', value = cursor string
```

### 3.8 sync_conflicts (local)

```sql
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id              TEXT PRIMARY KEY,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    local_payload   TEXT NOT NULL,
    server_payload  TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    resolved_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);
```

---

## 4. Regras de Integridade

### 4.1 Status Transitions (validar no service, não no banco)

```
asset:
  draft    → pending     (submit)
  pending  → approved    (approve, requer ADMIN)
  pending  → rejected    (reject, requer ADMIN + rejection_reason)
  rejected → editável     (correção via PATCH mantendo status até novo submit)
  approved → [nova versão] (gera novo registro com parent_id)

manejo/monitoramento:
  draft    → pending     (submit)
  pending  → approved    (approve, requer ADMIN)
  pending  → rejected    (reject, requer ADMIN + rejection_reason)
  rejected → editável     (correção via PATCH mantendo status até novo submit)
  approved → imutável
```

Transições não listadas são **proibidas**. O service deve rejeitar com erro.

### 4.2 Soft Delete Rules

- `deleted_at` preenchido = registro invisível para queries normais.
- Toda query de listagem inclui `WHERE deleted_at IS NULL`.
- Apenas registros com status `draft` podem ser soft-deleted.
- Registros `approved` **nunca** são deletados (nem soft delete).
- Audit logs **nunca** são deletados.

### 4.3 Versionamento de Assets Aprovados

Quando um asset `approved` precisa de edição:
1. Cria-se um novo registro com `parent_id = id_do_aprovado` e `version = version + 1`.
2. O registro anterior permanece intacto.
3. O novo registro começa com status `draft`.
4. Query de "versão atual" = `WHERE parent_id IS NULL OR id NOT IN (SELECT parent_id FROM assets WHERE parent_id IS NOT NULL)`.
   Alternativa mais simples: query pelo `qr_code` ordenado por `version DESC LIMIT 1`.

### 4.4 Organization Isolation

- Toda query inclui `WHERE organization_id = $org_id`.
- O `$org_id` vem do JWT (middleware extrai), **nunca** do request body/params.
- Não existem queries cross-organization no MVP.

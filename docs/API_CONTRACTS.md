# API_CONTRACTS.md — Contratos de API Completos

> **Propósito:** Referência exata de todos os endpoints com request/response JSON,
> validações, códigos de erro e regras de negócio. A IA deve usar este arquivo
> para gerar handlers, DTOs, e testes.

---

## 1. Convenções Gerais

- **Base URL:** `/api/v1`
- **Content-Type:** `application/json` (request e response)
- **Autenticação:** `Authorization: Bearer {access_token}` em todas as rotas exceto auth e público
- **Organization:** extraído do JWT no middleware, nunca do request body
- **Paginação:** cursor-based → `?cursor={last_id}&limit={n}` (padrão 20, máx 100)
- **Soft delete:** `DELETE` faz soft delete (preenche `deleted_at`), nunca remove do banco
- **Timestamps:** ISO 8601 com timezone → `"2025-06-01T10:30:00Z"`
- **IDs:** UUID string → `"550e8400-e29b-41d4-a716-446655440000"`

### Headers obrigatórios na response

```
X-Request-Id: {uuid}         -- gerado pelo middleware, propagado nos logs
Content-Type: application/json
```

---

## 2. Formato Padrão de Erro

Toda response de erro segue este formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descrição segura para o cliente",
    "details": [
      { "field": "latitude", "message": "deve estar entre -90 e 90" }
    ],
    "request_id": "req_550e8400"
  }
}
```

### Códigos de erro usados

| HTTP | code                      | Quando                                           |
| ---- | ------------------------- | ------------------------------------------------ |
| 400  | `VALIDATION_ERROR`        | Payload inválido, campo faltando, formato errado  |
| 400  | `BAD_REQUEST`             | Request mal formado (JSON inválido, etc.)         |
| 401  | `UNAUTHORIZED`            | Token ausente, expirado ou inválido               |
| 403  | `FORBIDDEN`               | Sem permissão para este recurso/ação              |
| 404  | `NOT_FOUND`               | Recurso não existe ou foi deletado                |
| 409  | `CONFLICT`                | Conflito de sync, violação de unicidade           |
| 409  | `INVALID_STATUS_TRANSITION` | Transição de estado não permitida               |
| 413  | `PAYLOAD_TOO_LARGE`       | Body excede limite                                |
| 422  | `UNPROCESSABLE_ENTITY`    | Regra de negócio violada                          |
| 429  | `RATE_LIMIT_EXCEEDED`     | Muitas requests                                   |
| 500  | `INTERNAL_ERROR`          | Erro interno (detalhes vão para o log, não aqui)  |

---

## 3. Auth

### POST /api/v1/auth/login

**Público** — sem autenticação.

Request:
```json
{
  "email": "tecnico@empresa.com",
  "password": "senhaSegura123"
}
```

Validação:
- `email`: obrigatório, formato de email válido, max 255 chars
- `password`: obrigatório, min 8 chars

Response 200:
```json
{
  "access_token": "eyJhbGciOiJFZERTQSIs...",
  "refresh_token": "rt_550e8400-e29b-41d4-a716-446655440000",
  "expires_in": 900,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "João Silva",
    "email": "tecnico@empresa.com",
    "role": "tech",
    "organization_id": "660e8400-e29b-41d4-a716-446655440000"
  }
}
```

Response 401:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Credenciais inválidas",
    "request_id": "req_abc123"
  }
}
```

Rate limit: 5 por minuto por IP.

---

### POST /api/v1/auth/refresh

**Público** — sem Bearer token (usa refresh token no body).

Request:
```json
{
  "refresh_token": "rt_550e8400-e29b-41d4-a716-446655440000"
}
```

Response 200:
```json
{
  "access_token": "eyJhbGciOiJFZERTQSIs...",
  "refresh_token": "rt_770e8400-new-token",
  "expires_in": 900
}
```

**Rotation:** o refresh token usado é invalidado. Se um token já invalidado for usado novamente, TODOS os tokens da família são revogados (possível roubo).

Response 401: token inválido, expirado ou revogado.

---

### POST /api/v1/auth/logout

**Autenticado.**

Request:
```json
{
  "refresh_token": "rt_550e8400-e29b-41d4-a716-446655440000"
}
```

Response 204: sem body.

---

## 4. Users

> Requer role `admin`. Escopo: apenas usuários da mesma organização.

### GET /api/v1/users

Query params:
- `cursor` (opcional): ID do último item da página anterior
- `limit` (opcional): 1-100, padrão 20
- `role` (opcional): filtro por role (`tech`, `admin`, `viewer`)
- `is_active` (opcional): `true` ou `false`

Response 200:
```json
{
  "data": [
    {
      "id": "550e8400-...",
      "name": "João Silva",
      "email": "joao@empresa.com",
      "role": "tech",
      "is_active": true,
      "created_at": "2025-06-01T10:00:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "660e8400-...",
    "has_more": true
  }
}
```

---

### GET /api/v1/users/{id}

Response 200:
```json
{
  "id": "550e8400-...",
  "name": "João Silva",
  "email": "joao@empresa.com",
  "role": "tech",
  "is_active": true,
  "created_at": "2025-06-01T10:00:00Z"
}
```

---

### POST /api/v1/users

Request:
```json
{
  "name": "Maria Santos",
  "email": "maria@empresa.com",
  "password": "senhaSegura123",
  "role": "tech"
}
```

Validação:
- `name`: obrigatório, 2-200 chars
- `email`: obrigatório, formato válido, max 255 chars, único na organização
- `password`: obrigatório, min 8 chars
- `role`: obrigatório, um de `tech`, `admin`, `viewer`

Response 201:
```json
{
  "id": "770e8400-...",
  "name": "Maria Santos",
  "email": "maria@empresa.com",
  "role": "tech",
  "is_active": true,
  "created_at": "2025-06-01T10:00:00Z"
}
```

---

### PATCH /api/v1/users/{id}

Request (campos opcionais):
```json
{
  "name": "Maria Santos Updated",
  "role": "admin",
  "is_active": false
}
```

Response 200: usuário atualizado completo.

**Nota:** não é possível alterar email ou password por este endpoint (endpoints separados futuros).

---

### DELETE /api/v1/users/{id}

Response 204: sem body. Soft delete.

---

## 5. Asset Types

> Requer role `admin` para criar/editar. `tech` e `viewer` podem listar.

### GET /api/v1/asset-types

Response 200:
```json
{
  "data": [
    {
      "id": "880e8400-...",
      "name": "Árvore",
      "description": "Espécime arbóreo individual",
      "is_active": true
    },
    {
      "id": "990e8400-...",
      "name": "Colônia",
      "description": "Colônia de abelhas ou insetos",
      "is_active": true
    }
  ]
}
```

Sem paginação (poucos registros por organização).

---

### POST /api/v1/asset-types

Request:
```json
{
  "name": "Nascente",
  "description": "Nascente de água natural"
}
```

Validação:
- `name`: obrigatório, 1-100 chars, único na organização
- `description`: opcional, max 500 chars

Response 201: asset type criado.

---

### PATCH /api/v1/asset-types/{id}

Request (campos opcionais):
```json
{
  "name": "Nascente Perene",
  "is_active": false
}
```

Response 200: asset type atualizado.

---

## 6. Assets

> Regras de leitura:
> - `admin`: vê todos os assets da organização
> - `tech`: vê todos os assets da organização
> - `viewer`: vê apenas assets `approved`

### GET /api/v1/assets

Query params:
- `cursor`: ID do último item
- `limit`: 1-100, padrão 20
- `status`: filtro (`draft`, `pending`, `approved`, `rejected`)
- `type_id`: filtro por asset_type_id
- `created_by`: filtro por user_id (ADMIN pode filtrar por qualquer user, TECH vê todos da org)

Response 200:
```json
{
  "data": [
    {
      "id": "aa0e8400-...",
      "asset_type": {
        "id": "880e8400-...",
        "name": "Árvore"
      },
      "latitude": -23.5505,
      "longitude": -46.6333,
      "gps_accuracy_m": 4.5,
      "qr_code": "https://app.ecoinventario.com/a/7k9x2m",
      "status": "approved",
      "version": 1,
      "notes": "Ipê amarelo, aproximadamente 15m de altura",
      "created_by": {
        "id": "550e8400-...",
        "name": "João Silva"
      },
      "approved_by": {
        "id": "660e8400-...",
        "name": "Admin Maria"
      },
      "created_at": "2025-06-01T10:00:00Z",
      "updated_at": "2025-06-02T14:30:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "bb0e8400-...",
    "has_more": true
  }
}
```

---

### GET /api/v1/assets/{id}

Response 200:
```json
{
  "id": "aa0e8400-...",
  "asset_type": {
    "id": "880e8400-...",
    "name": "Árvore"
  },
  "latitude": -23.5505,
  "longitude": -46.6333,
  "gps_accuracy_m": 4.5,
  "qr_code": "https://app.ecoinventario.com/a/7k9x2m",
  "status": "approved",
  "version": 1,
  "parent_id": null,
  "rejection_reason": null,
  "notes": "Ipê amarelo, aproximadamente 15m de altura",
  "media": [
    {
      "id": "cc0e8400-...",
      "type": "general",
      "mime_type": "image/jpeg",
      "url": "https://presigned-url.../photo.jpg"
    }
  ],
  "created_by": {
    "id": "550e8400-...",
    "name": "João Silva"
  },
  "approved_by": {
    "id": "660e8400-...",
    "name": "Admin Maria"
  },
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-06-02T14:30:00Z"
}
```

**Nota:** `media[].url` é uma URL assinada gerada sob demanda (expira em 1h). Nunca armazenada.

---

### POST /api/v1/assets

Request:
```json
{
  "asset_type_id": "880e8400-...",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "gps_accuracy_m": 4.5,
  "qr_code": "https://app.ecoinventario.com/a/7k9x2m",
  "notes": "Ipê amarelo, aproximadamente 15m de altura"
}
```

Validação:
- `asset_type_id`: obrigatório, UUID, deve existir e pertencer à organização
- `latitude`: obrigatório, float, -90 a 90
- `longitude`: obrigatório, float, -180 a 180
- `gps_accuracy_m`: opcional, float, 0 a 1000. Se > 50: backend aceita mas registra warning no audit
- `qr_code`: obrigatório, string, único globalmente
- `notes`: opcional, max 2000 chars

Response 201: asset criado com status `draft`.

---

### PATCH /api/v1/assets/{id}

Regras:
- TECH: pode editar apenas **seus próprios** assets com status `draft` ou `rejected`
- ADMIN: pode editar qualquer asset. Se `approved`, gera nova versão (novo registro).

Request (campos opcionais):
```json
{
  "asset_type_id": "990e8400-...",
  "latitude": -23.5510,
  "longitude": -46.6340,
  "notes": "Nota corrigida"
}
```

Response 200: asset atualizado.
Response 201 (se approved): cria nova versão e retorna o novo recurso.

---

### DELETE /api/v1/assets/{id}

Regras:
- Apenas assets com status `draft`
- TECH: apenas seus próprios
- ADMIN: qualquer da organização

Response 204: sem body. Soft delete.
Response 422: se status não é `draft`.

---

### POST /api/v1/assets/{id}/submit

Transição: `draft` → `pending`.

Regras:
- TECH: apenas seus próprios
- Todos os campos obrigatórios devem estar preenchidos
- Pelo menos 1 mídia com `upload_status = 'uploaded'`

Response 200:
```json
{
  "id": "aa0e8400-...",
  "status": "pending"
}
```

Response 409: status atual não permite esta transição.
Response 422: campos obrigatórios faltando ou sem mídia.

---

### POST /api/v1/assets/{id}/approve

Requer role `admin`.
Transição: `pending` → `approved`.

Response 200:
```json
{
  "id": "aa0e8400-...",
  "status": "approved",
  "approved_by": "660e8400-..."
}
```

---

### POST /api/v1/assets/{id}/reject

Requer role `admin`.
Transição: `pending` → `rejected`.

Request:
```json
{
  "reason": "Foto está desfocada, não é possível identificar a espécie"
}
```

Validação:
- `reason`: obrigatório, 1-1000 chars

Response 200:
```json
{
  "id": "aa0e8400-...",
  "status": "rejected",
  "rejection_reason": "Foto está desfocada, não é possível identificar a espécie"
}
```

---

### GET /api/v1/assets/{id}/history

Retorna cadeia de versões (parent chain).

Response 200:
```json
{
  "data": [
    { "id": "aa0e8400-...", "version": 1, "status": "approved", "created_at": "..." },
    { "id": "bb0e8400-...", "version": 2, "status": "pending", "parent_id": "aa0e8400-...", "created_at": "..." }
  ]
}
```

---

### GET /api/v1/assets/nearby

Query params:
- `lat`: obrigatório, float
- `lng`: obrigatório, float
- `radius_m`: opcional, padrão 5000, max 50000 (metros)
- `limit`: opcional, padrão 20, max 100

Response 200: mesma estrutura do GET /assets, com campo adicional `distance_m`.

---

## 7. Manejos

Mesma estrutura de CRUD que assets, aninhado sob asset.
Para leitura no dashboard:
- `admin`: vê todos da organização
- `tech`: vê todos da organização
- `viewer`: vê apenas registros `approved`

### GET /api/v1/assets/{asset_id}/manejos
### GET /api/v1/manejos/{id}
### POST /api/v1/manejos

Request:
```json
{
  "asset_id": "aa0e8400-...",
  "description": "Poda de formação realizada para melhorar a estrutura da copa",
  "before_media_id": "cc0e8400-...",
  "after_media_id": "dd0e8400-..."
}
```

Validação:
- `asset_id`: obrigatório, UUID, deve existir na organização
- `description`: obrigatório, 1-5000 chars
- `before_media_id`: opcional, UUID, deve referenciar media existente do mesmo asset
- `after_media_id`: opcional, UUID, idem

### PATCH /api/v1/manejos/{id}
### DELETE /api/v1/manejos/{id}
### POST /api/v1/manejos/{id}/submit
### POST /api/v1/manejos/{id}/approve
### POST /api/v1/manejos/{id}/reject

Regras de status, ownership e role idênticas às de assets, **exceto versionamento**.
Manejos aprovados são imutáveis; correções devem acontecer antes de novo submit.

---

## 8. Monitoramentos

Para leitura no dashboard:
- `admin`: vê todos da organização
- `tech`: vê todos da organização
- `viewer`: vê apenas registros `approved`

### POST /api/v1/monitoramentos

Request:
```json
{
  "asset_id": "aa0e8400-...",
  "notes": "Folhas apresentando manchas amarelas, possível deficiência nutricional",
  "health_status": "warning"
}
```

Validação:
- `asset_id`: obrigatório, UUID
- `notes`: obrigatório, 1-5000 chars
- `health_status`: obrigatório, um de `healthy`, `warning`, `critical`, `dead`

Demais endpoints (GET, PATCH, DELETE, submit, approve, reject): mesma estrutura.
Monitoramentos aprovados são imutáveis; correções devem acontecer antes de novo submit.

---

## 9. Stats (Dashboard Home)

> Autenticado. Usado pela home do dashboard.

### GET /api/v1/stats

Regras:
- `admin`: vê dados agregados da organização
- `tech`: vê dados agregados da organização
- `viewer`: vê apenas agregados de registros `approved`

Response 200:
```json
{
  "summary": {
    "total_assets": 120,
    "pending_approval": 8,
    "approved_assets": 94,
    "rejected_assets": 6
  },
  "assets_by_status": [
    { "status": "draft", "count": 12 },
    { "status": "pending", "count": 8 },
    { "status": "approved", "count": 94 },
    { "status": "rejected", "count": 6 }
  ],
  "assets_by_type": [
    { "asset_type_id": "880e8400-...", "name": "Árvore", "count": 70 }
  ],
  "monthly_activity": [
    { "month": "2025-06", "created_count": 21, "approved_count": 18 }
  ]
}
```

---

## 10. Media

### POST /api/v1/media/upload-url

Request:
```json
{
  "asset_id": "aa0e8400-...",
  "media_type": "general",
  "mime_type": "image/jpeg",
  "size_bytes": 2456789,
  "idempotency_key": "ee0e8400-..."
}
```

Validação:
- `asset_id`: obrigatório, UUID, deve existir na organização
- `media_type`: obrigatório, um de `before`, `after`, `general`
- `mime_type`: obrigatório, um de `image/jpeg`, `image/png`, `image/webp`
- `size_bytes`: obrigatório, integer, 1 a 10485760 (10MB)
- `idempotency_key`: obrigatório, UUID

Response 201:
```json
{
  "media_id": "ff0e8400-...",
  "upload_url": "https://s3.amazonaws.com/bucket/key?X-Amz-Signature=...",
  "expires_in": 900
}
```

**Fluxo:** client faz PUT direto na `upload_url` com o arquivo binário.

---

### POST /api/v1/media/{id}/confirm

Chamado após upload bem-sucedido.

Response 200:
```json
{
  "media_id": "ff0e8400-...",
  "upload_status": "uploaded"
}
```

Backend verifica que o objeto realmente existe no S3 antes de confirmar.

---

### GET /api/v1/media/{id}

Response 200:
```json
{
  "id": "ff0e8400-...",
  "asset_id": "aa0e8400-...",
  "type": "general",
  "mime_type": "image/jpeg",
  "size_bytes": 2456789,
  "upload_status": "uploaded",
  "url": "https://presigned-url.../photo.jpg",
  "created_at": "2025-06-01T10:00:00Z"
}
```

`url` é presigned, expira em 1 hora.

---

### DELETE /api/v1/media/{id}

Response 204: soft delete.

---

## 11. Sync

### POST /api/v1/sync/push

Request:
```json
{
  "operations": [
    {
      "idempotency_key": "op-001-uuid",
      "action": "CREATE",
      "entity_type": "asset",
      "entity_id": "aa0e8400-...",
      "payload": {
        "asset_type_id": "880e8400-...",
        "latitude": -23.5505,
        "longitude": -46.6333,
        "gps_accuracy_m": 4.5,
        "qr_code": "https://app.ecoinventario.com/a/7k9x2m",
        "notes": "Ipê amarelo"
      },
      "client_updated_at": "2025-06-01T10:00:00Z"
    },
    {
      "idempotency_key": "op-002-uuid",
      "action": "UPDATE",
      "entity_type": "asset",
      "entity_id": "bb0e8400-...",
      "payload": {
        "notes": "Nota atualizada em campo"
      },
      "client_updated_at": "2025-06-01T10:05:00Z"
    }
  ]
}
```

Validação:
- `operations`: obrigatório, array, max 50 itens
- Cada operação validada individualmente (mesmas regras do endpoint direto)
- `idempotency_key`: obrigatório, UUID, único
- `client_updated_at`: obrigatório para UPDATE, usado para detecção de conflito

Response 200:
```json
{
  "results": [
    {
      "idempotency_key": "op-001-uuid",
      "status": "ok",
      "entity_id": "aa0e8400-...",
      "server_updated_at": "2025-06-01T10:00:05Z"
    },
    {
      "idempotency_key": "op-002-uuid",
      "status": "conflict",
      "entity_id": "bb0e8400-...",
      "server_version": {
        "updated_at": "2025-06-01T09:58:00Z",
        "data": { "notes": "Nota editada pelo admin" }
      },
      "client_version": {
        "updated_at": "2025-06-01T10:05:00Z"
      }
    }
  ],
  "server_time": "2025-06-01T10:00:10Z"
}
```

Status por operação: `ok`, `conflict`, `error`, `duplicate` (idempotency key já processada).

---

### GET /api/v1/sync/pull

Query params:
- `since`: obrigatório, ISO 8601 timestamp
- `entity_types`: opcional, comma-separated (`asset,manejo,monitoramento`)
- `limit`: opcional, padrão 100, max 500
- `cursor`: opcional, para paginação dentro do pull

Response 200:
```json
{
  "changes": [
    {
      "entity_type": "asset",
      "entity_id": "aa0e8400-...",
      "action": "update",
      "data": {
        "id": "aa0e8400-...",
        "status": "approved",
        "approved_by": "660e8400-...",
        "updated_at": "2025-06-02T14:30:00Z"
      },
      "updated_at": "2025-06-02T14:30:00Z"
    }
  ],
  "has_more": false,
  "next_cursor": null,
  "server_time": "2025-06-02T15:00:00Z"
}
```

O mobile salva `server_time` como `last_sync_at` para o próximo pull.

---

## 12. Audit Logs

> Requer role `admin`.

### GET /api/v1/audit-logs

Query params:
- `entity_type`: opcional, filtro
- `entity_id`: opcional, filtro
- `performed_by`: opcional, filtro por user_id
- `action`: opcional, filtro
- `from`: opcional, ISO 8601
- `to`: opcional, ISO 8601
- `cursor`: opcional
- `limit`: 1-100, padrão 50

Response 200:
```json
{
  "data": [
    {
      "id": "log-001-...",
      "entity_type": "asset",
      "entity_id": "aa0e8400-...",
      "action": "approve",
      "performed_by": {
        "id": "660e8400-...",
        "name": "Admin Maria"
      },
      "changes": {
        "status": { "old": "pending", "new": "approved" }
      },
      "metadata": {
        "ip": "192.168.1.1",
        "user_agent": "Mozilla/5.0..."
      },
      "created_at": "2025-06-02T14:30:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "log-002-...",
    "has_more": true
  }
}
```

---

## 13. Public (Modo Visitante)

> Sem autenticação. Apenas dados com status `approved`.
> Usado pelo modo visitante do mobile e pelo mapa público web.
> **Sem dados sensíveis:** sem created_by, sem notes internos, sem rejection_reason, sem status workflow.
> **Cache:** CDN com TTL de 5 minutos em todos os endpoints públicos.

### GET /api/v1/public/asset-types

Lista tipos de asset para o filtro do mapa do visitante.

Response 200:
```json
{
  "data": [
    { "id": "880e8400-...", "name": "Árvore" },
    { "id": "990e8400-...", "name": "Colônia" },
    { "id": "aa0e8400-...", "name": "Nascente" }
  ]
}
```

---

### GET /api/v1/public/assets

Lista assets aprovados para exibição no mapa.

Query params:
- `bounds`: obrigatório, `sw_lat,sw_lng,ne_lat,ne_lng` (bounding box do mapa visível)
- `type_id`: opcional, filtro por tipo
- `limit`: max 200, padrão 100

Response 200:
```json
{
  "data": [
    {
      "id": "aa0e8400-...",
      "asset_type": {
        "id": "880e8400-...",
        "name": "Árvore"
      },
      "latitude": -23.5505,
      "longitude": -46.6333,
      "qr_code": "https://app.ecoinventario.com/a/7k9x2m",
      "thumbnail_url": "https://presigned.../thumb.jpg"
    }
  ]
}
```

`thumbnail_url` é presigned URL da primeira foto do asset (para preview no marker do mapa). Pode ser `null` se não há fotos.

---

### GET /api/v1/public/assets/{id}

Ficha completa de um asset aprovado, incluindo mídias, manejos e monitoramentos.
É o endpoint principal do modo visitante — alimenta a Ficha do Asset.

Response 200:
```json
{
  "id": "aa0e8400-...",
  "asset_type": {
    "id": "880e8400-...",
    "name": "Árvore"
  },
  "latitude": -23.5505,
  "longitude": -46.6333,
  "qr_code": "https://app.ecoinventario.com/a/7k9x2m",
  "organization_name": "Secretaria do Meio Ambiente de SP",
  "media": [
    {
      "id": "cc0e8400-...",
      "type": "general",
      "url": "https://presigned.../photo1.jpg"
    },
    {
      "id": "dd0e8400-...",
      "type": "general",
      "url": "https://presigned.../photo2.jpg"
    }
  ],
  "manejos": [
    {
      "id": "ee0e8400-...",
      "description": "Poda de formação para melhorar estrutura da copa",
      "before_media_url": "https://presigned.../before.jpg",
      "after_media_url": "https://presigned.../after.jpg",
      "created_at": "2025-06-15T10:00:00Z"
    }
  ],
  "monitoramentos": [
    {
      "id": "ff0e8400-...",
      "notes": "Espécime em bom estado, copa densa, sem sinais de pragas",
      "health_status": "healthy",
      "created_at": "2025-07-01T14:00:00Z"
    },
    {
      "id": "gg0e8400-...",
      "notes": "Manchas amarelas nas folhas, possível deficiência nutricional",
      "health_status": "warning",
      "created_at": "2025-08-01T09:00:00Z"
    }
  ],
  "created_at": "2025-06-01T10:00:00Z"
}
```

**O que é incluído:** tipo, fotos, localização, nome da organização, lista completa de manejos aprovados (com fotos before/after), lista completa de monitoramentos aprovados (com health status e notas).

**O que é excluído:** created_by (quem registrou), approved_by, status workflow, rejection_reason, notes internas, version, parent_id, gps_accuracy.

Response 404: asset não existe ou não está approved.

---

### GET /api/v1/public/assets/resolve-qr

Resolve QR code → retorna ID do asset (para deep linking do scanner).

Query params:
- `code`: obrigatório, string do QR code (ex: `https://app.ecoinventario.com/a/7k9x2m`)

Response 200:
```json
{
  "asset_id": "aa0e8400-...",
  "is_available": true
}
```

Response 200 (asset não aprovado):
```json
{
  "asset_id": null,
  "is_available": false
}
```

---

## 14. Health

### GET /api/v1/health

Público, sem autenticação.

Response 200:
```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "storage": "ok"
  },
  "uptime_seconds": 86400
}
```

Response 503:
```json
{
  "status": "degraded",
  "checks": {
    "database": "ok",
    "storage": "error"
  }
}
```

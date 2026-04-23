# BACKEND_GUIDE.md — Guia Completo do Backend Go

> **Propósito:** Tudo que a IA precisa para gerar código Go do backend.
> Structs, interfaces, patterns, auth, segurança, env vars.

---

## 1. Entrypoint e DI

```go
// cmd/server/main.go
func main() {
    cfg := config.MustLoad()     // falha se env var obrigatória faltar

    db, err := sql.Open("pgx", cfg.DatabaseURL)
    if err != nil { log.Fatal("database", "error", err) }
    defer db.Close()

    s3Client := storage.NewS3Client(cfg)

    // Repos → Services → Handlers (injeção por constructor)
    auditRepo  := audit.NewRepository(db)
    auditSvc   := audit.NewService(auditRepo)
    userRepo   := user.NewRepository(db)
    authSvc    := auth.NewService(userRepo, cfg)
    assetRepo  := asset.NewRepository(db)
    assetSvc   := asset.NewService(assetRepo, auditSvc)

    // Router
    r := chi.NewRouter()
    r.Use(middleware.RequestID, middleware.Logging, middleware.Recover, middleware.SecurityHeaders)
    registerRoutes(r, auth.NewHandler(authSvc), asset.NewHandler(assetSvc) /* ... */)

    log.Info("server starting", "port", cfg.Port)
    http.ListenAndServe(":"+cfg.Port, r)
}
```

---

## 2. Structs de Domínio

```go
// Campos nullable = ponteiro (*string, *float64, *time.Time)
// deleted_at nunca serializado: json:"-"

type Asset struct {
    ID              string     `json:"id"`
    OrganizationID  string     `json:"organization_id"`
    AssetTypeID     string     `json:"asset_type_id"`
    Latitude        float64    `json:"latitude"`
    Longitude       float64    `json:"longitude"`
    GPSAccuracyM    *float64   `json:"gps_accuracy_m"`
    QRCode          string     `json:"qr_code"`
    Status          string     `json:"status"`
    Version         int        `json:"version"`
    ParentID        *string    `json:"parent_id"`
    RejectionReason *string    `json:"rejection_reason"`
    Notes           *string    `json:"notes"`
    CreatedBy       string     `json:"created_by"`
    ApprovedBy      *string    `json:"approved_by"`
    CreatedAt       time.Time  `json:"created_at"`
    UpdatedAt       time.Time  `json:"updated_at"`
    DeletedAt       *time.Time `json:"-"`
}

type User struct {
    ID             string     `json:"id"`
    OrganizationID string     `json:"organization_id"`
    Name           string     `json:"name"`
    Email          string     `json:"email"`
    PasswordHash   string     `json:"-"` // nunca serializado
    Role           string     `json:"role"`
    IsActive       bool       `json:"is_active"`
    CreatedAt      time.Time  `json:"created_at"`
    UpdatedAt      time.Time  `json:"updated_at"`
    DeletedAt      *time.Time `json:"-"`
}

type Media struct {
    ID             string     `json:"id"`
    OrganizationID string     `json:"organization_id"`
    AssetID        string     `json:"asset_id"`
    StorageKey     string     `json:"storage_key"`
    StorageBucket  string     `json:"storage_bucket"`
    MimeType       string     `json:"mime_type"`
    SizeBytes      int64      `json:"size_bytes"`
    Type           string     `json:"type"`
    UploadStatus   string     `json:"upload_status"`
    CreatedBy      string     `json:"created_by"`
    CreatedAt      time.Time  `json:"created_at"`
    DeletedAt      *time.Time `json:"-"`
}

type Manejo struct {
    ID              string     `json:"id"`
    OrganizationID  string     `json:"organization_id"`
    AssetID         string     `json:"asset_id"`
    Description     string     `json:"description"`
    BeforeMediaID   *string    `json:"before_media_id"`
    AfterMediaID    *string    `json:"after_media_id"`
    Status          string     `json:"status"`
    RejectionReason *string    `json:"rejection_reason"`
    CreatedBy       string     `json:"created_by"`
    ApprovedBy      *string    `json:"approved_by"`
    CreatedAt       time.Time  `json:"created_at"`
    UpdatedAt       time.Time  `json:"updated_at"`
    DeletedAt       *time.Time `json:"-"`
}

type Monitoramento struct {
    ID              string     `json:"id"`
    OrganizationID  string     `json:"organization_id"`
    AssetID         string     `json:"asset_id"`
    Notes           string     `json:"notes"`
    HealthStatus    string     `json:"health_status"`
    Status          string     `json:"status"`
    RejectionReason *string    `json:"rejection_reason"`
    CreatedBy       string     `json:"created_by"`
    ApprovedBy      *string    `json:"approved_by"`
    CreatedAt       time.Time  `json:"created_at"`
    UpdatedAt       time.Time  `json:"updated_at"`
    DeletedAt       *time.Time `json:"-"`
}

type AuditLog struct {
    ID             string          `json:"id"`
    OrganizationID string          `json:"organization_id"`
    EntityType     string          `json:"entity_type"`
    EntityID       string          `json:"entity_id"`
    Action         string          `json:"action"`
    PerformedBy    string          `json:"performed_by"`
    Changes        json.RawMessage `json:"changes"`
    Metadata       json.RawMessage `json:"metadata"`
    CreatedAt      time.Time       `json:"created_at"`
}
```

### Constantes

```go
const (
    StatusDraft    = "draft"
    StatusPending  = "pending"
    StatusApproved = "approved"
    StatusRejected = "rejected"

    RoleTech   = "tech"
    RoleAdmin  = "admin"
    RoleViewer = "viewer"

    HealthHealthy  = "healthy"
    HealthWarning  = "warning"
    HealthCritical = "critical"
    HealthDead     = "dead"
)
```

---

## 2b. Value Objects — Política do Projeto

> **Object Calisthenics:** Conceitos de domínio com regra de validação própria **não** devem ser primitivos.
> Em Go (sem OO puro), implementamos como types com método `Validate()` ou construtor que retorna erro.

### Candidatos a Value Object neste projeto

| Conceito | Decisão | Motivo |
|----------|---------|--------|
| `Email` | **Value Object** | Regra de formato + normalização lowercase |
| `Coordinates` | **Value Object** | Validação de range lat/lon + encapsula ST_MakePoint |
| `AssetStatus` | **Custom type + `CanTransitionTo()`** | Evita string arbitrária no service |
| `UserRole` | **Custom type + `IsValid()`** | Idem |
| `QRCode`, `Notes`, `Description` | Primitivo OK | Apenas tamanho máximo, validado no DTO |

### Implementação padrão em Go

```go
// internal/shared/vo/email.go
type Email string

func NewEmail(raw string) (Email, error) {
    normalized := strings.ToLower(strings.TrimSpace(raw))
    if !emailRegex.MatchString(normalized) {
        return "", apperror.NewValidation("email inválido")
    }
    return Email(normalized), nil
}
func (e Email) String() string { return string(e) }

// internal/shared/vo/coordinates.go
type Coordinates struct {
    Latitude  float64
    Longitude float64
}

func NewCoordinates(lat, lon float64) (Coordinates, error) {
    if lat < -90 || lat > 90 {
        return Coordinates{}, apperror.NewValidation("latitude inválida")
    }
    if lon < -180 || lon > 180 {
        return Coordinates{}, apperror.NewValidation("longitude inválida")
    }
    return Coordinates{Latitude: lat, Longitude: lon}, nil
}

// internal/shared/vo/status.go
type AssetStatus string

const (
    StatusDraft    AssetStatus = "draft"
    StatusPending  AssetStatus = "pending"
    StatusApproved AssetStatus = "approved"
    StatusRejected AssetStatus = "rejected"
)

func (s AssetStatus) IsValid() bool {
    switch s {
    case StatusDraft, StatusPending, StatusApproved, StatusRejected:
        return true
    }
    return false
}

func (s AssetStatus) CanTransitionTo(next AssetStatus) bool {
    allowed := map[AssetStatus][]AssetStatus{
        StatusDraft:    {StatusPending},
        StatusPending:  {StatusApproved, StatusRejected},
        StatusRejected: {StatusPending},
        StatusApproved: {},
    }
    for _, a := range allowed[s] {
        if a == next { return true }
    }
    return false
}
```

> **Regra de ouro:** Se o tipo tem apenas tamanho máximo como restrição, use primitivo + validação no DTO.
> Se tem regra de negócio (formato, range, transição de estado), use Value Object.

---

## 3. DTOs (Request/Response)

```go
// --- Requests (com tags validate) ---

type CreateAssetRequest struct {
    AssetTypeID  string   `json:"asset_type_id" validate:"required,uuid"`
    Latitude     float64  `json:"latitude"       validate:"required,min=-90,max=90"`
    Longitude    float64  `json:"longitude"      validate:"required,min=-180,max=180"`
    GPSAccuracyM *float64 `json:"gps_accuracy_m" validate:"omitempty,min=0,max=1000"`
    QRCode       string   `json:"qr_code"        validate:"required,max=200"`
    Notes        *string  `json:"notes"          validate:"omitempty,max=2000"`
}

type UpdateAssetRequest struct {
    AssetTypeID  *string  `json:"asset_type_id"  validate:"omitempty,uuid"`
    Latitude     *float64 `json:"latitude"       validate:"omitempty,min=-90,max=90"`
    Longitude    *float64 `json:"longitude"      validate:"omitempty,min=-180,max=180"`
    Notes        *string  `json:"notes"          validate:"omitempty,max=2000"`
}

type RejectRequest struct {
    Reason string `json:"reason" validate:"required,min=1,max=1000"`
}

type LoginRequest struct {
    Email    string `json:"email"    validate:"required,email,max=255"`
    Password string `json:"password" validate:"required,min=8"`
}

type CreateUserRequest struct {
    Name     string `json:"name"     validate:"required,min=2,max=200"`
    Email    string `json:"email"    validate:"required,email,max=255"`
    Password string `json:"password" validate:"required,min=8"`
    Role     string `json:"role"     validate:"required,oneof=tech admin viewer"`
}

// --- Responses ---

type AssetResponse struct {
    ID              string    `json:"id"`
    AssetType       TypeRef   `json:"asset_type"`
    Latitude        float64   `json:"latitude"`
    Longitude       float64   `json:"longitude"`
    GPSAccuracyM    *float64  `json:"gps_accuracy_m,omitempty"`
    QRCode          string    `json:"qr_code"`
    Status          string    `json:"status"`
    Version         int       `json:"version"`
    ParentID        *string   `json:"parent_id,omitempty"`
    RejectionReason *string   `json:"rejection_reason,omitempty"`
    Notes           *string   `json:"notes,omitempty"`
    CreatedBy       UserRef   `json:"created_by"`
    ApprovedBy      *UserRef  `json:"approved_by,omitempty"`
    CreatedAt       string    `json:"created_at"`
    UpdatedAt       string    `json:"updated_at"`
}

type TypeRef struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

type UserRef struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

type PaginatedResponse[T any] struct {
    Data       []T        `json:"data"`
    Pagination Pagination `json:"pagination"`
}

type Pagination struct {
    NextCursor *string `json:"next_cursor"`
    HasMore    bool    `json:"has_more"`
}
```

---

## 4. Patterns: Handler → Service → Repository

### Handler (recebe HTTP, valida, chama service)

```go
func (h *Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    var req CreateAssetRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        response.BadRequest(w, r, "JSON inválido")
        return
    }
    if err := validate.Struct(req); err != nil {
        response.ValidationError(w, r, err)
        return
    }

    asset, err := h.service.Create(ctx, req)
    if err != nil {
        response.HandleError(w, r, err)
        return
    }

    response.JSON(w, http.StatusCreated, asset)
}
```

### Service (lógica de negócio, sem HTTP)

> **Lei de Demeter:** O service fala apenas com seus colaboradores diretos (repo, auditSvc).
> **Proibido:** encadear chamadas como `s.repo.FindUser(id).GetOrg().GetSlug()`.
> Se precisar de dado de outro domínio, injete o service daquele domínio — não o repository.

```go
func (s *Service) Create(ctx context.Context, req CreateAssetRequest) (*Asset, error) {
    orgID := shared.GetOrgID(ctx)
    userID := shared.GetUserID(ctx)

    // Valida coordenadas via Value Object
    coords, err := vo.NewCoordinates(req.Latitude, req.Longitude)
    if err != nil {
        return nil, err
    }

    exists, err := s.repo.AssetTypeExists(ctx, req.AssetTypeID, orgID)
    if err != nil {
        return nil, fmt.Errorf("checking asset type: %w", err)
    }
    if !exists {
        return nil, apperror.NewNotFound("asset_type", req.AssetTypeID)
    }

    asset := &Asset{
        OrganizationID: orgID,
        AssetTypeID:    req.AssetTypeID,
        Latitude:       coords.Latitude,
        Longitude:      coords.Longitude,
        GPSAccuracyM:   req.GPSAccuracyM,
        QRCode:         req.QRCode,
        Notes:          req.Notes,
        Status:         StatusDraft,
        Version:        1,
        CreatedBy:      userID,
    }

    created, err := s.repo.Insert(ctx, asset)
    if err != nil {
        return nil, fmt.Errorf("inserting asset: %w", err)
    }

    s.audit.Log(ctx, audit.Entry{
        OrganizationID: orgID, EntityType: "asset",
        EntityID: created.ID, Action: "create", PerformedBy: userID,
    })

    return created, nil
}
```

### Repository (banco, prepared statements)

```go
func (r *repo) FindByID(ctx context.Context, id, orgID string) (*Asset, error) {
    query := `
        SELECT id, organization_id, asset_type_id,
               ST_Y(location::geometry) AS latitude,
               ST_X(location::geometry) AS longitude,
               gps_accuracy_m, qr_code, status, version,
               parent_id, rejection_reason, notes,
               created_by, approved_by, created_at, updated_at
        FROM assets
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `
    var a Asset
    err := r.db.QueryRowContext(ctx, query, id, orgID).Scan(/* ... */)
    if err == sql.ErrNoRows {
        return nil, apperror.NewNotFound("asset", id)
    }
    return &a, err
}

func (r *repo) Insert(ctx context.Context, a *Asset) (*Asset, error) {
    // ATENÇÃO: ST_MakePoint(longitude, latitude) — ordem invertida!
    query := `
        INSERT INTO assets (organization_id, asset_type_id, location, gps_accuracy_m,
            qr_code, status, version, notes, created_by)
        VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at, updated_at
    `
    err := r.db.QueryRowContext(ctx, query,
        a.OrganizationID, a.AssetTypeID,
        a.Longitude, a.Latitude, // ← longitude primeiro!
        a.GPSAccuracyM, a.QRCode, a.Status, a.Version, a.Notes, a.CreatedBy,
    ).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
    return a, err
}
```

---

## 5. Error Pattern

```go
// internal/shared/apperror/errors.go

type AppError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Status  int    `json:"-"`
}

func (e *AppError) Error() string { return e.Message }

func NewNotFound(entity, id string) *AppError {
    return &AppError{Code: "NOT_FOUND", Message: fmt.Sprintf("%s não encontrado", entity), Status: 404}
}
func NewConflict(msg string) *AppError {
    return &AppError{Code: "CONFLICT", Message: msg, Status: 409}
}
func NewForbidden(msg string) *AppError {
    return &AppError{Code: "FORBIDDEN", Message: msg, Status: 403}
}
func NewInvalidStatusTransition(from, to string) *AppError {
    return &AppError{Code: "INVALID_STATUS_TRANSITION",
        Message: fmt.Sprintf("Transição de '%s' para '%s' não permitida", from, to), Status: 409}
}
func NewValidation(msg string) *AppError {
    return &AppError{Code: "VALIDATION_ERROR", Message: msg, Status: 400}
}

// internal/shared/response/json.go
func HandleError(w http.ResponseWriter, r *http.Request, err error) {
    var appErr *apperror.AppError
    if errors.As(err, &appErr) {
        JSON(w, appErr.Status, map[string]any{"error": map[string]any{
            "code": appErr.Code, "message": appErr.Message,
            "request_id": r.Header.Get("X-Request-Id"),
        }})
        return
    }
    // Erro interno: loga, retorna genérico
    slog.Error("internal error", "error", err, "request_id", middleware.GetRequestID(r.Context()))
    JSON(w, 500, map[string]any{"error": map[string]any{
        "code": "INTERNAL_ERROR", "message": "Erro interno",
        "request_id": middleware.GetRequestID(r.Context()),
    }})
}
```

---

## 6. Auth e JWT

### JWT — Ed25519
```
Access Token:
  Algoritmo: EdDSA (Ed25519)
  Payload: { sub: user_id, org: org_id, role, exp, iat, jti }
  Expiração: 15 minutos

Refresh Token:
  Formato: UUID opaco "rt_{uuid}"
  Armazenado no banco: hash SHA-256 (nunca texto puro)
  Expiração: 30 dias
  Rotation: cada uso gera novo par — token usado é invalidado
  Detecção de roubo: token revogado usado novamente → revoga TODA a família
```

### Password — Argon2id
```go
const (
    ArgonTime    = 1
    ArgonMemory  = 64 * 1024  // 64 MB
    ArgonThreads = 4
    ArgonKeyLen  = 32
    ArgonSaltLen = 16
)
```

### Middleware Auth
```go
// Extrai JWT → valida → coloca no context
func AuthMiddleware(next http.Handler) http.Handler

// Verifica role
func RequireRole(roles ...string) func(http.Handler) http.Handler

// Context keys
const (
    CtxUserID contextKey = "user_id"
    CtxOrgID  contextKey = "org_id"
    CtxRole   contextKey = "role"
)
func GetUserID(ctx context.Context) string
func GetOrgID(ctx context.Context) string
func GetRole(ctx context.Context) string
```

### Rate Limiting

| Endpoint           | Limite             | Chave    |
| ------------------ | ------------------ | -------- |
| POST /auth/login   | 5/min              | IP       |
| POST /sync/push    | 30/min             | user_id  |
| POST /media/upload-url | 60/min         | user_id  |
| Demais             | 120/min            | user_id  |

MVP: sliding window in-memory (sem Redis).

---

## 7. Variáveis de Ambiente

A aplicação **não inicia** se faltar variável obrigatória.

```bash
# .env.example

# Servidor
PORT=8080
ENV=development    # development | staging | production

# Banco
DATABASE_URL=postgres://ecoinventario:ecoinventario_dev@localhost:5432/ecoinventario?sslmode=disable
PASSWORD_PEPPER=troque_esta_chave_em_producao

# JWT (gerar: openssl genpkey -algorithm Ed25519)
JWT_PRIVATE_KEY=base64_private_key
JWT_PUBLIC_KEY=base64_public_key
JWT_ACCESS_EXPIRY=15m       # opcional, padrão 15m
JWT_REFRESH_EXPIRY=720h     # opcional, padrão 30d

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=ecoinventario-media
S3_REGION=us-east-1           # opcional
S3_USE_PATH_STYLE=true        # true para MinIO

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Docker Compose (dev)

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: ecoinventario
      POSTGRES_PASSWORD: ecoinventario_dev
      POSTGRES_DB: ecoinventario
    ports: ["5432:5432"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
```

---

## 8. Migrations

Usar `golang-migrate`. PostGIS habilitado na primeira migration.

```
migrations/
├── 000001_enable_postgis.up.sql        ← PRIMEIRO
├── 000002_create_organizations.up.sql
├── 000003_create_users.up.sql
├── 000004_create_refresh_tokens.up.sql
├── 000005_create_asset_types.up.sql
├── 000006_create_assets.up.sql
├── 000007_create_media.up.sql
├── 000008_create_manejos.up.sql
├── 000009_create_monitoramentos.up.sql
├── 000010_create_audit_logs.up.sql
├── 000011_create_idempotency_keys.up.sql
└── (cada um com respectivo .down.sql)
```

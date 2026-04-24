package sync

import (
	"encoding/json"
	"time"
)

// Ações de sync push.
const (
	ActionCreate = "CREATE"
	ActionUpdate = "UPDATE"
	ActionDelete = "DELETE"
)

// Status por operação na resposta do push.
const (
	StatusOk        = "ok"
	StatusConflict  = "conflict"
	StatusError     = "error"
	StatusDuplicate = "duplicate"
)

// Ações de mudança no pull.
const (
	ChangeCreate = "create"
	ChangeUpdate = "update"
	ChangeDelete = "delete"
)

// Operation é uma operação individual no batch de push.
type Operation struct {
	IdempotencyKey  string          `json:"idempotency_key"`
	Action          string          `json:"action"`
	EntityType      string          `json:"entity_type"`
	EntityID        string          `json:"entity_id"`
	Payload         json.RawMessage `json:"payload"`
	ClientUpdatedAt *time.Time      `json:"client_updated_at"`
}

// PushRequest é o corpo de POST /api/v1/sync/push.
type PushRequest struct {
	Operations []Operation `json:"operations" validate:"required,min=1,max=50,dive"`
}

// OperationResult é o resultado de uma operação individual.
type OperationResult struct {
	IdempotencyKey  string       `json:"idempotency_key"`
	Status          string       `json:"status"`
	EntityID        string       `json:"entity_id,omitempty"`
	ServerUpdatedAt *time.Time   `json:"server_updated_at,omitempty"`
	ServerVersion   *VersionInfo `json:"server_version,omitempty"`
	ClientVersion   *VersionInfo `json:"client_version,omitempty"`
	Error           string       `json:"error,omitempty"`
}

// VersionInfo carrega timestamp e dados para detecção de conflito.
type VersionInfo struct {
	UpdatedAt time.Time       `json:"updated_at"`
	Data      json.RawMessage `json:"data,omitempty"`
}

// PushResponse é a resposta de POST /api/v1/sync/push.
type PushResponse struct {
	Results    []OperationResult `json:"results"`
	ServerTime time.Time         `json:"server_time"`
}

// Change representa uma entidade alterada retornada pelo pull.
type Change struct {
	EntityType string          `json:"entity_type"`
	EntityID   string          `json:"entity_id"`
	Action     string          `json:"action"`
	Data       json.RawMessage `json:"data,omitempty"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

// PullResponse é a resposta de GET /api/v1/sync/pull.
type PullResponse struct {
	Changes    []Change  `json:"changes"`
	HasMore    bool      `json:"has_more"`
	NextCursor *string   `json:"next_cursor"`
	ServerTime time.Time `json:"server_time"`
}

// PullParams são os parâmetros do pull.
type PullParams struct {
	OrgID       string
	Since       time.Time
	EntityTypes []string
	Limit       int
	Cursor      string
}

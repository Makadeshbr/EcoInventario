package audit

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

// LogEntry é o registro completo do audit log como salvo no banco.
type LogEntry struct {
	ID             string
	OrganizationID string
	EntityType     string
	EntityID       string
	Action         string
	PerformedBy    string
	Changes        json.RawMessage
	Metadata       json.RawMessage
}

// ListFilters filtra audit logs na listagem.
type ListFilters struct {
	EntityType  string
	EntityID    string
	PerformedBy string
	Action      string
	From        string
	To          string
	Cursor      string
	Limit       int
}

// Repository define operações de banco para audit logs.
type Repository interface {
	Insert(ctx context.Context, entry *LogEntry) error
}

type repository struct {
	db *sql.DB
}

// NewRepository cria repositório de audit backed por PostgreSQL.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Insert(ctx context.Context, e *LogEntry) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	query := `
		INSERT INTO audit_logs (id, organization_id, entity_type, entity_id, action, performed_by, changes, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query,
		e.ID, e.OrganizationID, e.EntityType, e.EntityID,
		e.Action, e.PerformedBy, e.Changes, e.Metadata,
	)
	if err != nil {
		return fmt.Errorf("inserindo audit log: %w", err)
	}
	return nil
}


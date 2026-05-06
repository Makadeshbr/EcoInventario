package audit

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// LogEntry é o registro completo do audit log como salvo no banco.
type LogEntry struct {
	ID              string
	OrganizationID  string
	EntityType      string
	EntityID        string
	Action          string
	PerformedBy     string
	PerformedByName string
	Changes         json.RawMessage
	Metadata        json.RawMessage
	CreatedAt       time.Time
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
	List(ctx context.Context, orgID string, f ListFilters) ([]*LogEntry, error)
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

func (r *repository) List(ctx context.Context, orgID string, f ListFilters) ([]*LogEntry, error) {
	args := []any{f.Limit, orgID}
	conditions := []string{"al.organization_id = $2"}
	n := 3

	if f.EntityType != "" {
		conditions = append(conditions, fmt.Sprintf("al.entity_type = $%d", n))
		args = append(args, f.EntityType)
		n++
	}
	if f.EntityID != "" {
		conditions = append(conditions, fmt.Sprintf("al.entity_id = $%d", n))
		args = append(args, f.EntityID)
		n++
	}
	if f.PerformedBy != "" {
		conditions = append(conditions, fmt.Sprintf("al.performed_by = $%d", n))
		args = append(args, f.PerformedBy)
		n++
	}
	if f.Action != "" {
		conditions = append(conditions, fmt.Sprintf("al.action = $%d", n))
		args = append(args, f.Action)
		n++
	}
	if f.From != "" {
		conditions = append(conditions, fmt.Sprintf("al.created_at >= $%d", n))
		args = append(args, f.From)
		n++
	}
	if f.To != "" {
		conditions = append(conditions, fmt.Sprintf("al.created_at <= $%d", n))
		args = append(args, f.To)
		n++
	}
	if f.Cursor != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(al.created_at, al.id) < (SELECT created_at, id FROM audit_logs WHERE id = $%d AND organization_id = $2)",
			n,
		))
		args = append(args, f.Cursor)
	}

	query := fmt.Sprintf(`
		SELECT al.id, al.organization_id, al.entity_type, al.entity_id, al.action,
		       al.performed_by, COALESCE(u.name, ''), al.changes, al.metadata, al.created_at
		FROM audit_logs al
		LEFT JOIN users u ON u.id = al.performed_by
		WHERE %s
		ORDER BY al.created_at DESC, al.id DESC
		LIMIT $1
	`, strings.Join(conditions, " AND "))

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("listando audit logs: %w", err)
	}
	defer rows.Close()

	var result []*LogEntry
	for rows.Next() {
		entry, err := scanLog(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, entry)
	}
	return result, rows.Err()
}

func scanLog(rows *sql.Rows) (*LogEntry, error) {
	entry := &LogEntry{}
	err := rows.Scan(
		&entry.ID,
		&entry.OrganizationID,
		&entry.EntityType,
		&entry.EntityID,
		&entry.Action,
		&entry.PerformedBy,
		&entry.PerformedByName,
		&entry.Changes,
		&entry.Metadata,
		&entry.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lendo audit log: %w", err)
	}
	return entry, nil
}

package monitoramento

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// Repository define operações de banco para monitoramentos.
type Repository interface {
	FindByID(ctx context.Context, id, orgID string) (*Monitoramento, error)
	Insert(ctx context.Context, m *Monitoramento) error
	Update(ctx context.Context, m *Monitoramento) error
	UpdateStatus(ctx context.Context, m *Monitoramento) error
	SoftDelete(ctx context.Context, id, orgID string) error
	List(ctx context.Context, f ListFilters) ([]*Monitoramento, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository cria repositório de monitoramentos.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

const selectWithRefs = `
SELECT m.id, m.organization_id, m.asset_id, m.notes, m.health_status,
       m.status, m.rejection_reason, m.created_by, m.approved_by,
       m.created_at, m.updated_at,
       cu.name AS created_by_name,
       au.name AS approved_by_name
FROM monitoramentos m
JOIN users cu ON cu.id = m.created_by
LEFT JOIN users au ON au.id = m.approved_by
`

func (r *repository) FindByID(ctx context.Context, id, orgID string) (*Monitoramento, error) {
	query := selectWithRefs + `
		WHERE m.id = $1 AND m.organization_id = $2 AND m.deleted_at IS NULL
	`
	return scanOne(r.db.QueryRowContext(ctx, query, id, orgID))
}

func (r *repository) Insert(ctx context.Context, m *Monitoramento) error {
	query := `
		INSERT INTO monitoramentos (
			organization_id, asset_id, notes,
			health_status, status, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		m.OrganizationID, m.AssetID, m.Notes,
		m.HealthStatus, m.Status, m.CreatedBy,
	).Scan(&m.ID, &m.CreatedAt, &m.UpdatedAt)
}

func (r *repository) Update(ctx context.Context, m *Monitoramento) error {
	query := `
		UPDATE monitoramentos
		SET notes = $1,
		    health_status = $2,
		    updated_at = now()
		WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
		RETURNING updated_at
	`
	err := r.db.QueryRowContext(ctx, query,
		m.Notes, m.HealthStatus,
		m.ID, m.OrganizationID,
	).Scan(&m.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("monitoramento não encontrado para update")
	}
	return err
}

func (r *repository) UpdateStatus(ctx context.Context, m *Monitoramento) error {
	query := `
		UPDATE monitoramentos
		SET status = $1,
		    approved_by = $2,
		    rejection_reason = $3,
		    updated_at = now()
		WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
		RETURNING updated_at
	`
	err := r.db.QueryRowContext(ctx, query,
		m.Status, m.ApprovedBy, m.RejectionReason,
		m.ID, m.OrganizationID,
	).Scan(&m.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("monitoramento não encontrado para update de status")
	}
	return err
}

func (r *repository) SoftDelete(ctx context.Context, id, orgID string) error {
	query := `
		UPDATE monitoramentos SET deleted_at = now()
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	res, err := r.db.ExecContext(ctx, query, id, orgID)
	if err != nil {
		return fmt.Errorf("soft delete monitoramento: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("monitoramento não encontrado para delete")
	}
	return nil
}

func (r *repository) List(ctx context.Context, f ListFilters) ([]*Monitoramento, error) {
	args := []any{f.Limit, f.OrgID}
	conditions := []string{"m.organization_id = $2", "m.deleted_at IS NULL"}
	n := 3

	if f.AssetID != "" {
		conditions = append(conditions, fmt.Sprintf("m.asset_id = $%d", n))
		args = append(args, f.AssetID)
		n++
	}
	if f.CreatedBy != "" {
		conditions = append(conditions, fmt.Sprintf("m.created_by = $%d", n))
		args = append(args, f.CreatedBy)
		n++
	}
	if f.CreatedFrom != "" {
		conditions = append(conditions, fmt.Sprintf("m.created_at >= $%d::date", n))
		args = append(args, f.CreatedFrom)
		n++
	}
	if f.CreatedTo != "" {
		conditions = append(conditions, fmt.Sprintf("m.created_at < ($%d::date + INTERVAL '1 day')", n))
		args = append(args, f.CreatedTo)
		n++
	}
	if f.HealthStatus != "" {
		conditions = append(conditions, fmt.Sprintf("m.health_status = $%d", n))
		args = append(args, f.HealthStatus)
		n++
	}
	if f.Cursor != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(m.created_at, m.id) < (SELECT created_at, id FROM monitoramentos WHERE id = $%d AND organization_id = $2 AND deleted_at IS NULL)",
			n,
		))
		args = append(args, f.Cursor)
		n++
	}
	if f.OnlyApproved {
		conditions = append(conditions, "m.status = 'approved'")
	} else if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("m.status = $%d", n))
		args = append(args, f.Status)
		n++
	}

	query := selectWithRefs + fmt.Sprintf(`
		WHERE %s
		ORDER BY m.created_at DESC, m.id DESC
		LIMIT $1
	`, strings.Join(conditions, " AND "))

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("listando monitoramentos: %w", err)
	}
	defer rows.Close()

	return scanAll(rows)
}

// --- helpers ---

func scanOne(row *sql.Row) (*Monitoramento, error) {
	m := &Monitoramento{}
	err := row.Scan(
		&m.ID, &m.OrganizationID, &m.AssetID, &m.Notes, &m.HealthStatus,
		&m.Status, &m.RejectionReason, &m.CreatedBy, &m.ApprovedBy,
		&m.CreatedAt, &m.UpdatedAt,
		&m.CreatedByName, &m.ApprovedByName,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lendo monitoramento: %w", err)
	}
	return m, nil
}

func scanAll(rows *sql.Rows) ([]*Monitoramento, error) {
	var items []*Monitoramento
	for rows.Next() {
		m := &Monitoramento{}
		if err := rows.Scan(
			&m.ID, &m.OrganizationID, &m.AssetID, &m.Notes, &m.HealthStatus,
			&m.Status, &m.RejectionReason, &m.CreatedBy, &m.ApprovedBy,
			&m.CreatedAt, &m.UpdatedAt,
			&m.CreatedByName, &m.ApprovedByName,
		); err != nil {
			return nil, fmt.Errorf("lendo monitoramento: %w", err)
		}
		items = append(items, m)
	}
	return items, rows.Err()
}

package manejo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// Repository define operações de banco para manejos.
type Repository interface {
	FindByID(ctx context.Context, id, orgID string) (*Manejo, error)
	Insert(ctx context.Context, m *Manejo) error
	Update(ctx context.Context, m *Manejo) error
	UpdateStatus(ctx context.Context, m *Manejo) error
	SoftDelete(ctx context.Context, id, orgID string) error
	List(ctx context.Context, f ListFilters) ([]*Manejo, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository cria repositório de manejos.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

const selectWithRefs = `
SELECT m.id, m.organization_id, m.asset_id, m.description,
       m.before_media_id, m.after_media_id,
       m.status, m.rejection_reason, m.created_by, m.approved_by,
       m.created_at, m.updated_at,
       cu.name AS created_by_name,
       au.name AS approved_by_name
FROM manejos m
JOIN users cu ON cu.id = m.created_by
LEFT JOIN users au ON au.id = m.approved_by
`

func (r *repository) FindByID(ctx context.Context, id, orgID string) (*Manejo, error) {
	query := selectWithRefs + `
		WHERE m.id = $1 AND m.organization_id = $2 AND m.deleted_at IS NULL
	`
	return scanOne(r.db.QueryRowContext(ctx, query, id, orgID))
}

func (r *repository) Insert(ctx context.Context, m *Manejo) error {
	query := `
		INSERT INTO manejos (
			organization_id, asset_id, description,
			before_media_id, after_media_id,
			status, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		m.OrganizationID, m.AssetID, m.Description,
		m.BeforeMediaID, m.AfterMediaID,
		m.Status, m.CreatedBy,
	).Scan(&m.ID, &m.CreatedAt, &m.UpdatedAt)
}

func (r *repository) Update(ctx context.Context, m *Manejo) error {
	query := `
		UPDATE manejos
		SET description = $1,
		    before_media_id = $2,
		    after_media_id = $3,
		    updated_at = now()
		WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
		RETURNING updated_at
	`
	err := r.db.QueryRowContext(ctx, query,
		m.Description, m.BeforeMediaID, m.AfterMediaID,
		m.ID, m.OrganizationID,
	).Scan(&m.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("manejo não encontrado para update")
	}
	return err
}

func (r *repository) UpdateStatus(ctx context.Context, m *Manejo) error {
	query := `
		UPDATE manejos
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
		return fmt.Errorf("manejo não encontrado para update de status")
	}
	return err
}

func (r *repository) SoftDelete(ctx context.Context, id, orgID string) error {
	query := `
		UPDATE manejos SET deleted_at = now()
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	res, err := r.db.ExecContext(ctx, query, id, orgID)
	if err != nil {
		return fmt.Errorf("soft delete manejo: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("manejo não encontrado para delete")
	}
	return nil
}

func (r *repository) List(ctx context.Context, f ListFilters) ([]*Manejo, error) {
	args := []any{f.Limit, f.OrgID}
	conditions := []string{"m.organization_id = $2", "m.deleted_at IS NULL"}
	n := 3

	if f.AssetID != "" {
		conditions = append(conditions, fmt.Sprintf("m.asset_id = $%d", n))
		args = append(args, f.AssetID)
		n++
	}
	if f.Cursor != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(m.created_at, m.id) < (SELECT created_at, id FROM manejos WHERE id = $%d AND organization_id = $2 AND deleted_at IS NULL)",
			n,
		))
		args = append(args, f.Cursor)
		n++
	}
	if f.OnlyApproved {
		conditions = append(conditions, "m.status = 'approved'")
	}

	_ = n
	query := selectWithRefs + fmt.Sprintf(`
		WHERE %s
		ORDER BY m.created_at DESC, m.id DESC
		LIMIT $1
	`, strings.Join(conditions, " AND "))

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("listando manejos: %w", err)
	}
	defer rows.Close()

	return scanAll(rows)
}

// --- helpers ---

func scanOne(row *sql.Row) (*Manejo, error) {
	m := &Manejo{}
	err := row.Scan(
		&m.ID, &m.OrganizationID, &m.AssetID, &m.Description,
		&m.BeforeMediaID, &m.AfterMediaID,
		&m.Status, &m.RejectionReason, &m.CreatedBy, &m.ApprovedBy,
		&m.CreatedAt, &m.UpdatedAt,
		&m.CreatedByName, &m.ApprovedByName,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lendo manejo: %w", err)
	}
	return m, nil
}

func scanAll(rows *sql.Rows) ([]*Manejo, error) {
	var items []*Manejo
	for rows.Next() {
		m := &Manejo{}
		if err := rows.Scan(
			&m.ID, &m.OrganizationID, &m.AssetID, &m.Description,
			&m.BeforeMediaID, &m.AfterMediaID,
			&m.Status, &m.RejectionReason, &m.CreatedBy, &m.ApprovedBy,
			&m.CreatedAt, &m.UpdatedAt,
			&m.CreatedByName, &m.ApprovedByName,
		); err != nil {
			return nil, fmt.Errorf("lendo manejo: %w", err)
		}
		items = append(items, m)
	}
	return items, rows.Err()
}

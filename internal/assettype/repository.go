package assettype

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// Repository define operações de banco para tipos de ativo.
type Repository interface {
	FindByID(ctx context.Context, id, orgID string) (*AssetType, error)
	FindByName(ctx context.Context, name, orgID string) (*AssetType, error)
	Insert(ctx context.Context, at *AssetType) error
	Update(ctx context.Context, at *AssetType) error
	List(ctx context.Context, orgID string) ([]*AssetType, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository cria repositório de tipos de ativo.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindByID(ctx context.Context, id, orgID string) (*AssetType, error) {
	query := `
		SELECT id, organization_id, name, description, is_active, created_at
		FROM asset_types
		WHERE id = $1 AND organization_id = $2
	`
	return r.scanOne(r.db.QueryRowContext(ctx, query, id, orgID))
}

func (r *repository) FindByName(ctx context.Context, name, orgID string) (*AssetType, error) {
	query := `
		SELECT id, organization_id, name, description, is_active, created_at
		FROM asset_types
		WHERE name = $1 AND organization_id = $2
	`
	return r.scanOne(r.db.QueryRowContext(ctx, query, name, orgID))
}

func (r *repository) Insert(ctx context.Context, at *AssetType) error {
	query := `
		INSERT INTO asset_types (organization_id, name, description, is_active)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	return r.db.QueryRowContext(ctx, query,
		at.OrganizationID, at.Name, at.Description, at.IsActive,
	).Scan(&at.ID, &at.CreatedAt)
}

func (r *repository) Update(ctx context.Context, at *AssetType) error {
	query := `
		UPDATE asset_types
		SET name = $1, description = $2, is_active = $3
		WHERE id = $4 AND organization_id = $5
		RETURNING id
	`
	var id string
	err := r.db.QueryRowContext(ctx, query,
		at.Name, at.Description, at.IsActive, at.ID, at.OrganizationID,
	).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("tipo não encontrado para update")
	}
	return err
}

func (r *repository) List(ctx context.Context, orgID string) ([]*AssetType, error) {
	query := `
		SELECT id, organization_id, name, description, is_active, created_at
		FROM asset_types
		WHERE organization_id = $1
		ORDER BY name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("listando tipos: %w", err)
	}
	defer rows.Close()

	var types []*AssetType
	for rows.Next() {
		at := &AssetType{}
		if err := rows.Scan(&at.ID, &at.OrganizationID, &at.Name, &at.Description, &at.IsActive, &at.CreatedAt); err != nil {
			return nil, fmt.Errorf("lendo tipo: %w", err)
		}
		types = append(types, at)
	}
	return types, rows.Err()
}

func (r *repository) scanOne(row *sql.Row) (*AssetType, error) {
	at := &AssetType{}
	err := row.Scan(&at.ID, &at.OrganizationID, &at.Name, &at.Description, &at.IsActive, &at.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lendo tipo de ativo: %w", err)
	}
	return at, nil
}

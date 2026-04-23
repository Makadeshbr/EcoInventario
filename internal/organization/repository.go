package organization

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// Repository define operações de leitura de organizações.
type Repository interface {
	FindByID(ctx context.Context, id string) (*Organization, error)
	FindBySlug(ctx context.Context, slug string) (*Organization, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository cria repositório de organizações.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindByID(ctx context.Context, id string) (*Organization, error) {
	query := `
		SELECT id, name, slug, created_at, updated_at
		FROM organizations
		WHERE id = $1
	`
	return r.scan(r.db.QueryRowContext(ctx, query, id))
}

func (r *repository) FindBySlug(ctx context.Context, slug string) (*Organization, error) {
	query := `
		SELECT id, name, slug, created_at, updated_at
		FROM organizations
		WHERE slug = $1
	`
	return r.scan(r.db.QueryRowContext(ctx, query, slug))
}

func (r *repository) scan(row *sql.Row) (*Organization, error) {
	o := &Organization{}
	err := row.Scan(&o.ID, &o.Name, &o.Slug, &o.CreatedAt, &o.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lendo organização: %w", err)
	}
	return o, nil
}

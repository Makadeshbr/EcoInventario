package media

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// Repository define operações de banco para media.
type Repository interface {
	Insert(ctx context.Context, m *Media) error
	FindByID(ctx context.Context, id, orgID string) (*Media, error)
	FindByIdempotencyKey(ctx context.Context, key string) (*Media, error)
	Update(ctx context.Context, m *Media) error
	SoftDelete(ctx context.Context, id, orgID string) error
	ListByAsset(ctx context.Context, assetID, orgID string) ([]*Media, error)
	CountUploadedByAsset(ctx context.Context, assetID string) (int, error)
	HasUploaded(ctx context.Context, assetID string) (bool, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository cria repositório de media.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Insert(ctx context.Context, m *Media) error {
	query := `
		INSERT INTO media (
			organization_id, asset_id, storage_key, storage_bucket,
			mime_type, size_bytes, type, upload_status, idempotency_key, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at
	`
	return r.db.QueryRowContext(ctx, query,
		m.OrganizationID, m.AssetID, m.StorageKey, m.StorageBucket,
		m.MimeType, m.SizeBytes, m.Type, m.UploadStatus, m.IdempotencyKey, m.CreatedBy,
	).Scan(&m.ID, &m.CreatedAt)
}

func (r *repository) FindByID(ctx context.Context, id, orgID string) (*Media, error) {
	query := `
		SELECT id, organization_id, asset_id, storage_key, storage_bucket,
		       mime_type, size_bytes, type, upload_status,
		       COALESCE(idempotency_key::text, ''), created_by, created_at
		FROM media
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	return scanOne(r.db.QueryRowContext(ctx, query, id, orgID))
}

func (r *repository) FindByIdempotencyKey(ctx context.Context, key string) (*Media, error) {
	query := `
		SELECT id, organization_id, asset_id, storage_key, storage_bucket,
		       mime_type, size_bytes, type, upload_status,
		       COALESCE(idempotency_key::text, ''), created_by, created_at
		FROM media
		WHERE idempotency_key = $1 AND deleted_at IS NULL
	`
	return scanOne(r.db.QueryRowContext(ctx, query, key))
}

func (r *repository) Update(ctx context.Context, m *Media) error {
	query := `
		UPDATE media
		SET upload_status = $1
		WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
		RETURNING id
	`
	var id string
	err := r.db.QueryRowContext(ctx, query, m.UploadStatus, m.ID, m.OrganizationID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("media não encontrada para update")
	}
	return err
}

func (r *repository) SoftDelete(ctx context.Context, id, orgID string) error {
	query := `
		UPDATE media SET deleted_at = now()
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	res, err := r.db.ExecContext(ctx, query, id, orgID)
	if err != nil {
		return fmt.Errorf("soft delete media: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("media não encontrada para delete")
	}
	return nil
}

func (r *repository) ListByAsset(ctx context.Context, assetID, orgID string) ([]*Media, error) {
	query := `
		SELECT id, organization_id, asset_id, storage_key, storage_bucket,
		       mime_type, size_bytes, type, upload_status,
		       COALESCE(idempotency_key::text, ''), created_by, created_at
		FROM media
		WHERE asset_id = $1 AND organization_id = $2 AND deleted_at IS NULL
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, assetID, orgID)
	if err != nil {
		return nil, fmt.Errorf("listando media do asset: %w", err)
	}
	defer rows.Close()

	var items []*Media
	for rows.Next() {
		m, err := scanRow(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, m)
	}
	return items, rows.Err()
}

func (r *repository) CountUploadedByAsset(ctx context.Context, assetID string) (int, error) {
	query := `
		SELECT COUNT(*) FROM media
		WHERE asset_id = $1 AND upload_status = 'uploaded' AND deleted_at IS NULL
	`
	var count int
	if err := r.db.QueryRowContext(ctx, query, assetID).Scan(&count); err != nil {
		return 0, fmt.Errorf("contando media do asset: %w", err)
	}
	return count, nil
}

func (r *repository) HasUploaded(ctx context.Context, assetID string) (bool, error) {
	count, err := r.CountUploadedByAsset(ctx, assetID)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// --- helpers ---

func scanOne(row *sql.Row) (*Media, error) {
	m := &Media{}
	err := row.Scan(
		&m.ID, &m.OrganizationID, &m.AssetID, &m.StorageKey, &m.StorageBucket,
		&m.MimeType, &m.SizeBytes, &m.Type, &m.UploadStatus, &m.IdempotencyKey,
		&m.CreatedBy, &m.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lendo media: %w", err)
	}
	return m, nil
}

func scanRow(rows *sql.Rows) (*Media, error) {
	m := &Media{}
	err := rows.Scan(
		&m.ID, &m.OrganizationID, &m.AssetID, &m.StorageKey, &m.StorageBucket,
		&m.MimeType, &m.SizeBytes, &m.Type, &m.UploadStatus, &m.IdempotencyKey,
		&m.CreatedBy, &m.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("lendo media: %w", err)
	}
	return m, nil
}

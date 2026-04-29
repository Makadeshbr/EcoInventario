package public

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// Repository provê acesso somente-leitura aos dados públicos (aprovados).
type Repository interface {
	ListAssetTypes(ctx context.Context) ([]AssetTypeItem, error)
	ListAssetsByBounds(ctx context.Context, p BoundsParams) ([]AssetSummaryRow, error)
	FindAssetByID(ctx context.Context, id string) (*AssetDetailRow, error)
	FindAssetByQRCode(ctx context.Context, code string) (*string, error)
	ListMediaByAsset(ctx context.Context, assetID string) ([]MediaRow, error)
	ListManejosByAsset(ctx context.Context, assetID string) ([]ManejoRow, error)
	ListMonitoramentosByAsset(ctx context.Context, assetID string) ([]MonitoramentoRow, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository cria o repositório público.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) ListAssetTypes(ctx context.Context) ([]AssetTypeItem, error) {
	query := `
		SELECT id, name
		FROM asset_types
		WHERE is_active = true
		ORDER BY name ASC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("listando asset types públicos: %w", err)
	}
	defer rows.Close()

	var items []AssetTypeItem
	for rows.Next() {
		var it AssetTypeItem
		if err := rows.Scan(&it.ID, &it.Name); err != nil {
			return nil, fmt.Errorf("lendo asset type: %w", err)
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *repository) ListAssetsByBounds(ctx context.Context, p BoundsParams) ([]AssetSummaryRow, error) {
	limit := p.Limit
	if limit <= 0 || limit > 200 {
		limit = 100
	}

	args := []any{p.SWLng, p.SWLat, p.NELng, p.NELat, limit}
	typeFilter := ""
	if p.TypeID != "" {
		args = append(args, p.TypeID)
		typeFilter = fmt.Sprintf("AND a.asset_type_id = $%d", len(args))
	}

	query := fmt.Sprintf(`
		SELECT a.id, a.asset_type_id, at.name,
		       ST_Y(a.location::geometry) AS latitude,
		       ST_X(a.location::geometry) AS longitude,
		       a.qr_code,
		       (SELECT m.storage_key FROM media m
		        WHERE m.asset_id = a.id AND m.type = 'general'
		          AND m.upload_status = 'uploaded' AND m.deleted_at IS NULL
		        ORDER BY m.created_at ASC LIMIT 1) AS thumbnail_key,
		       (SELECT m.storage_bucket FROM media m
		        WHERE m.asset_id = a.id AND m.type = 'general'
		          AND m.upload_status = 'uploaded' AND m.deleted_at IS NULL
		        ORDER BY m.created_at ASC LIMIT 1) AS thumbnail_bucket
		FROM assets a
		JOIN asset_types at ON at.id = a.asset_type_id
		WHERE a.status = 'approved'
		  AND a.deleted_at IS NULL
		  AND a.location && ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
		  %s
		LIMIT $5
	`, typeFilter)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("listando assets por bounds: %w", err)
	}
	defer rows.Close()

	var result []AssetSummaryRow
	for rows.Next() {
		var row AssetSummaryRow
		if err := rows.Scan(
			&row.ID, &row.AssetTypeID, &row.TypeName,
			&row.Latitude, &row.Longitude, &row.QRCode,
			&row.ThumbnailKey, &row.ThumbnailBucket,
		); err != nil {
			return nil, fmt.Errorf("lendo asset summary: %w", err)
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *repository) FindAssetByID(ctx context.Context, id string) (*AssetDetailRow, error) {
	query := `
		SELECT a.id, a.asset_type_id, at.name,
		       ST_Y(a.location::geometry), ST_X(a.location::geometry),
		       a.qr_code, o.name, a.created_at
		FROM assets a
		JOIN asset_types at ON at.id = a.asset_type_id
		JOIN organizations o ON o.id = a.organization_id
		WHERE a.id = $1 AND a.status = 'approved' AND a.deleted_at IS NULL
	`
	row := &AssetDetailRow{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&row.ID, &row.AssetTypeID, &row.TypeName,
		&row.Latitude, &row.Longitude,
		&row.QRCode, &row.OrganizationName, &row.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("buscando asset público: %w", err)
	}
	return row, nil
}

func (r *repository) FindAssetByQRCode(ctx context.Context, code string) (*string, error) {
	query := `
		SELECT id FROM assets
		WHERE qr_code = $1 AND status = 'approved' AND deleted_at IS NULL
		ORDER BY version DESC
		LIMIT 1
	`
	var id string
	err := r.db.QueryRowContext(ctx, query, code).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("resolvendo QR code: %w", err)
	}
	return &id, nil
}

func (r *repository) ListMediaByAsset(ctx context.Context, assetID string) ([]MediaRow, error) {
	query := `
		SELECT id, storage_key, storage_bucket, type
		FROM media
		WHERE asset_id = $1
		  AND upload_status = 'uploaded'
		  AND deleted_at IS NULL
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, assetID)
	if err != nil {
		return nil, fmt.Errorf("listando media pública: %w", err)
	}
	defer rows.Close()

	var result []MediaRow
	for rows.Next() {
		var m MediaRow
		if err := rows.Scan(&m.ID, &m.StorageKey, &m.StorageBucket, &m.Type); err != nil {
			return nil, fmt.Errorf("lendo media: %w", err)
		}
		result = append(result, m)
	}
	return result, rows.Err()
}

func (r *repository) ListManejosByAsset(ctx context.Context, assetID string) ([]ManejoRow, error) {
	query := `
		SELECT m.id, m.description,
		       bm.storage_key, bm.storage_bucket,
		       am.storage_key, am.storage_bucket,
		       m.created_at
		FROM manejos m
		LEFT JOIN media bm ON bm.id = m.before_media_id AND bm.deleted_at IS NULL
		LEFT JOIN media am ON am.id = m.after_media_id AND am.deleted_at IS NULL
		WHERE m.asset_id = $1
		  AND m.status = 'approved'
		  AND m.deleted_at IS NULL
		ORDER BY m.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, assetID)
	if err != nil {
		return nil, fmt.Errorf("listando manejos públicos: %w", err)
	}
	defer rows.Close()

	var result []ManejoRow
	for rows.Next() {
		var m ManejoRow
		if err := rows.Scan(
			&m.ID, &m.Description,
			&m.BeforeStorageKey, &m.BeforeBucket,
			&m.AfterStorageKey, &m.AfterBucket,
			&m.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("lendo manejo: %w", err)
		}
		result = append(result, m)
	}
	return result, rows.Err()
}

func (r *repository) ListMonitoramentosByAsset(ctx context.Context, assetID string) ([]MonitoramentoRow, error) {
	query := `
		SELECT id, notes, health_status, created_at
		FROM monitoramentos
		WHERE asset_id = $1
		  AND status = 'approved'
		  AND deleted_at IS NULL
		ORDER BY created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, assetID)
	if err != nil {
		return nil, fmt.Errorf("listando monitoramentos públicos: %w", err)
	}
	defer rows.Close()

	var result []MonitoramentoRow
	for rows.Next() {
		var m MonitoramentoRow
		if err := rows.Scan(&m.ID, &m.Notes, &m.HealthStatus, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("lendo monitoramento: %w", err)
		}
		result = append(result, m)
	}
	return result, rows.Err()
}

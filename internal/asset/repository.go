package asset

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// Repository define operações de banco para assets.
type Repository interface {
	FindByID(ctx context.Context, id, orgID string) (*Asset, error)
	FindByQRCode(ctx context.Context, qrCode string) (*Asset, error)
	Insert(ctx context.Context, a *Asset) error
	Update(ctx context.Context, a *Asset) error
	UpdateStatus(ctx context.Context, a *Asset) error
	SoftDelete(ctx context.Context, id, orgID string) error
	List(ctx context.Context, f ListFilters) ([]*Asset, error)
	Nearby(ctx context.Context, p NearbyParams) ([]*Asset, error)
	History(ctx context.Context, id, orgID string) ([]HistoryEntry, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository cria repositório de assets.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

// selectWithRefs é o fragmento base que devolve os campos de asset com os joins
// de asset_type e users (created_by, approved_by). Usado por FindByID/List/Nearby.
const selectWithRefs = `
SELECT a.id, a.organization_id, a.asset_type_id,
       ST_Y(a.location::geometry) AS latitude,
       ST_X(a.location::geometry) AS longitude,
       a.gps_accuracy_m, a.qr_code, a.status, a.version, a.parent_id,
       a.rejection_reason, a.notes, a.created_by, a.approved_by,
       a.created_at, a.updated_at,
       at.name AS asset_type_name,
       cu.name AS created_by_name,
       au.name AS approved_by_name
FROM assets a
JOIN asset_types at ON at.id = a.asset_type_id
JOIN users cu ON cu.id = a.created_by
LEFT JOIN users au ON au.id = a.approved_by
`

func (r *repository) FindByID(ctx context.Context, id, orgID string) (*Asset, error) {
	query := selectWithRefs + `
		WHERE a.id = $1 AND a.organization_id = $2 AND a.deleted_at IS NULL
	`
	row := r.db.QueryRowContext(ctx, query, id, orgID)
	return scanOne(row)
}

func (r *repository) FindByQRCode(ctx context.Context, qrCode string) (*Asset, error) {
	// Múltiplas versões compartilham o qr_code (ver migration 000013). ORDER BY version DESC
	// torna o lookup determinístico: retorna a versão mais recente. Usado como guarda no Create
	// (basta existir qualquer versão para bloquear duplicata).
	query := `
		SELECT id, organization_id, asset_type_id,
		       ST_Y(location::geometry), ST_X(location::geometry),
		       gps_accuracy_m, qr_code, status, version, parent_id,
		       rejection_reason, notes, created_by, approved_by, created_at, updated_at
		FROM assets
		WHERE qr_code = $1 AND deleted_at IS NULL
		ORDER BY version DESC
		LIMIT 1
	`
	row := r.db.QueryRowContext(ctx, query, qrCode)
	a := &Asset{}
	err := row.Scan(
		&a.ID, &a.OrganizationID, &a.AssetTypeID,
		&a.Latitude, &a.Longitude,
		&a.GPSAccuracyM, &a.QRCode, &a.Status, &a.Version, &a.ParentID,
		&a.RejectionReason, &a.Notes, &a.CreatedBy, &a.ApprovedBy,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lendo asset por qr_code: %w", err)
	}
	return a, nil
}

func (r *repository) Insert(ctx context.Context, a *Asset) error {
	// ATENÇÃO: em ST_MakePoint a LONGITUDE vem primeiro (eixo X), depois latitude (eixo Y).
	query := `
		INSERT INTO assets (
			id, organization_id, asset_type_id, location, gps_accuracy_m, qr_code,
			status, version, parent_id, notes, created_by
		)
		VALUES (
			COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()),
			$2, $3, ST_MakePoint($4, $5)::geography, $6, $7,
			$8, $9, $10, $11, $12
		)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		a.ID,
		a.OrganizationID, a.AssetTypeID,
		a.Longitude, a.Latitude,
		a.GPSAccuracyM, a.QRCode,
		a.Status, a.Version, a.ParentID, a.Notes, a.CreatedBy,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
}

func (r *repository) Update(ctx context.Context, a *Asset) error {
	query := `
		UPDATE assets
		SET asset_type_id = $1,
		    location = ST_MakePoint($2, $3)::geography,
		    gps_accuracy_m = $4,
		    notes = $5,
		    updated_at = now()
		WHERE id = $6 AND organization_id = $7 AND deleted_at IS NULL
		RETURNING updated_at
	`
	err := r.db.QueryRowContext(ctx, query,
		a.AssetTypeID, a.Longitude, a.Latitude,
		a.GPSAccuracyM, a.Notes,
		a.ID, a.OrganizationID,
	).Scan(&a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("asset não encontrado para update")
	}
	return err
}

func (r *repository) UpdateStatus(ctx context.Context, a *Asset) error {
	query := `
		UPDATE assets
		SET status = $1,
		    approved_by = $2,
		    rejection_reason = $3,
		    updated_at = now()
		WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
		RETURNING updated_at
	`
	err := r.db.QueryRowContext(ctx, query,
		a.Status, a.ApprovedBy, a.RejectionReason,
		a.ID, a.OrganizationID,
	).Scan(&a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("asset não encontrado para update de status")
	}
	return err
}

func (r *repository) SoftDelete(ctx context.Context, id, orgID string) error {
	query := `
		UPDATE assets SET deleted_at = now()
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	res, err := r.db.ExecContext(ctx, query, id, orgID)
	if err != nil {
		return fmt.Errorf("soft delete asset: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("asset não encontrado para delete")
	}
	return nil
}

func (r *repository) List(ctx context.Context, f ListFilters) ([]*Asset, error) {
	args := []any{f.Limit, f.OrgID}
	conditions := []string{"a.organization_id = $2", "a.deleted_at IS NULL"}
	n := 3

	if f.Cursor != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(a.created_at, a.id) < (SELECT created_at, id FROM assets WHERE id = $%d AND organization_id = $2 AND deleted_at IS NULL)",
			n,
		))
		args = append(args, f.Cursor)
		n++
	}
	if f.OnlyApproved {
		conditions = append(conditions, "a.status = 'approved'")
	} else if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("a.status = $%d", n))
		args = append(args, f.Status)
		n++
	}
	if f.TypeID != "" {
		conditions = append(conditions, fmt.Sprintf("a.asset_type_id = $%d", n))
		args = append(args, f.TypeID)
		n++
	}
	if f.CreatedBy != "" {
		conditions = append(conditions, fmt.Sprintf("a.created_by = $%d", n))
		args = append(args, f.CreatedBy)
	}

	query := selectWithRefs + fmt.Sprintf(`
		WHERE %s
		ORDER BY a.created_at DESC, a.id DESC
		LIMIT $1
	`, strings.Join(conditions, " AND "))

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("listando assets: %w", err)
	}
	defer rows.Close()

	return scanAll(rows)
}

func (r *repository) Nearby(ctx context.Context, p NearbyParams) ([]*Asset, error) {
	// ST_DWithin usa geography em metros. location já é geography, então não precisa de cast.
	// ORDER BY distance_m calculada no SELECT. Apenas approved.
	query := selectWithRefs + `,
	       ST_Distance(a.location, ST_MakePoint($1, $2)::geography) AS distance_m
		WHERE a.organization_id = $3
		  AND a.deleted_at IS NULL
		  AND a.status = 'approved'
		  AND ST_DWithin(a.location, ST_MakePoint($1, $2)::geography, $4)
		ORDER BY distance_m ASC
		LIMIT $5
	`
	rows, err := r.db.QueryContext(ctx, query, p.Lng, p.Lat, p.OrgID, p.RadiusM, p.Limit)
	if err != nil {
		return nil, fmt.Errorf("busca geográfica: %w", err)
	}
	defer rows.Close()

	var assets []*Asset
	for rows.Next() {
		a, err := scanRowWithDistance(rows)
		if err != nil {
			return nil, err
		}
		assets = append(assets, a)
	}
	return assets, rows.Err()
}

func (r *repository) History(ctx context.Context, id, orgID string) ([]HistoryEntry, error) {
	// Recursive CTE: resolve ancestors (pai do pai ...) e descendants (filhos dos filhos ...).
	// UNION combina sem duplicatas. Ordena por version ASC para mostrar a cadeia completa.
	query := `
		WITH RECURSIVE ancestors AS (
			SELECT id, parent_id, version, status, created_at
			FROM assets
			WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
			UNION
			SELECT a.id, a.parent_id, a.version, a.status, a.created_at
			FROM assets a
			JOIN ancestors anc ON anc.parent_id = a.id
			WHERE a.organization_id = $2 AND a.deleted_at IS NULL
		),
		descendants AS (
			SELECT id, parent_id, version, status, created_at
			FROM assets
			WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
			UNION
			SELECT a.id, a.parent_id, a.version, a.status, a.created_at
			FROM assets a
			JOIN descendants d ON a.parent_id = d.id
			WHERE a.organization_id = $2 AND a.deleted_at IS NULL
		)
		SELECT id, parent_id, version, status, created_at FROM ancestors
		UNION
		SELECT id, parent_id, version, status, created_at FROM descendants
		ORDER BY version ASC
	`
	rows, err := r.db.QueryContext(ctx, query, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("histórico de asset: %w", err)
	}
	defer rows.Close()

	var entries []HistoryEntry
	for rows.Next() {
		var h HistoryEntry
		if err := rows.Scan(&h.ID, &h.ParentID, &h.Version, &h.Status, &h.CreatedAt); err != nil {
			return nil, fmt.Errorf("lendo histórico: %w", err)
		}
		entries = append(entries, h)
	}
	return entries, rows.Err()
}

// --- helpers ---

func scanOne(row *sql.Row) (*Asset, error) {
	a := &Asset{}
	err := row.Scan(
		&a.ID, &a.OrganizationID, &a.AssetTypeID,
		&a.Latitude, &a.Longitude,
		&a.GPSAccuracyM, &a.QRCode, &a.Status, &a.Version, &a.ParentID,
		&a.RejectionReason, &a.Notes, &a.CreatedBy, &a.ApprovedBy,
		&a.CreatedAt, &a.UpdatedAt,
		&a.AssetTypeName, &a.CreatedByName, &a.ApprovedByName,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lendo asset: %w", err)
	}
	return a, nil
}

func scanAll(rows *sql.Rows) ([]*Asset, error) {
	var assets []*Asset
	for rows.Next() {
		a := &Asset{}
		if err := rows.Scan(
			&a.ID, &a.OrganizationID, &a.AssetTypeID,
			&a.Latitude, &a.Longitude,
			&a.GPSAccuracyM, &a.QRCode, &a.Status, &a.Version, &a.ParentID,
			&a.RejectionReason, &a.Notes, &a.CreatedBy, &a.ApprovedBy,
			&a.CreatedAt, &a.UpdatedAt,
			&a.AssetTypeName, &a.CreatedByName, &a.ApprovedByName,
		); err != nil {
			return nil, fmt.Errorf("lendo asset: %w", err)
		}
		assets = append(assets, a)
	}
	return assets, rows.Err()
}

func scanRowWithDistance(rows *sql.Rows) (*Asset, error) {
	a := &Asset{}
	var dist float64
	if err := rows.Scan(
		&a.ID, &a.OrganizationID, &a.AssetTypeID,
		&a.Latitude, &a.Longitude,
		&a.GPSAccuracyM, &a.QRCode, &a.Status, &a.Version, &a.ParentID,
		&a.RejectionReason, &a.Notes, &a.CreatedBy, &a.ApprovedBy,
		&a.CreatedAt, &a.UpdatedAt,
		&a.AssetTypeName, &a.CreatedByName, &a.ApprovedByName,
		&dist,
	); err != nil {
		return nil, fmt.Errorf("lendo asset próximo: %w", err)
	}
	a.DistanceM = &dist
	return a, nil
}

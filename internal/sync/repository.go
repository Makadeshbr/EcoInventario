package sync

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"time"
)

// SyncRepository consulta múltiplas tabelas de entidades para o pull.
type SyncRepository interface {
	PullChanges(ctx context.Context, p PullParams) ([]Change, error)
}

type syncRepository struct {
	db *sql.DB
}

// NewSyncRepository cria o repositório de sync pull.
func NewSyncRepository(db *sql.DB) SyncRepository {
	return &syncRepository{db: db}
}

func (r *syncRepository) PullChanges(ctx context.Context, p PullParams) ([]Change, error) {
	since := p.Since
	if p.Cursor != "" {
		if t, err := time.Parse(time.RFC3339Nano, p.Cursor); err == nil {
			since = t
		}
	}

	var all []Change

	if shouldInclude(p.EntityTypes, "asset") {
		items, err := r.pullAssets(ctx, p.OrgID, since)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}

	if shouldInclude(p.EntityTypes, "manejo") {
		items, err := r.pullManejos(ctx, p.OrgID, since)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}

	if shouldInclude(p.EntityTypes, "monitoramento") {
		items, err := r.pullMonitoramentos(ctx, p.OrgID, since)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}

	sort.Slice(all, func(i, j int) bool {
		return all[i].UpdatedAt.Before(all[j].UpdatedAt)
	})

	return all, nil
}

// pullAssets retorna assets alterados (incluindo soft-deleted) desde since.
func (r *syncRepository) pullAssets(ctx context.Context, orgID string, since time.Time) ([]Change, error) {
	query := `
		SELECT a.id, a.organization_id, a.asset_type_id, at.name AS asset_type_name,
		       ST_Y(a.location::geometry) AS latitude,
		       ST_X(a.location::geometry) AS longitude,
		       a.gps_accuracy_m, a.qr_code, a.status, a.version, a.parent_id,
		       a.rejection_reason, a.notes, a.created_by, a.approved_by,
		       a.updated_at, a.created_at, a.deleted_at
		FROM assets a
		JOIN asset_types at ON at.id = a.asset_type_id
		WHERE a.organization_id = $1
		  AND (a.updated_at > $2 OR (a.deleted_at IS NOT NULL AND a.deleted_at > $2))
	`
	rows, err := r.db.QueryContext(ctx, query, orgID, since)
	if err != nil {
		return nil, fmt.Errorf("pull assets: %w", err)
	}
	defer rows.Close()

	var changes []Change
	for rows.Next() {
		var (
			id, orgID2, atID, atName, qrCode, status, createdBy string
			latitude, longitude                                 float64
			version                                             int
			gpsAccuracyM                                        *float32
			parentID, rejectionReason, notes, approvedBy        *string
			updatedAt, createdAt                                time.Time
			deletedAt                                           *time.Time
		)
		if err := rows.Scan(&id, &orgID2, &atID, &atName,
			&latitude, &longitude, &gpsAccuracyM, &qrCode, &status, &version,
			&parentID, &rejectionReason, &notes, &createdBy, &approvedBy,
			&updatedAt, &createdAt, &deletedAt); err != nil {
			return nil, fmt.Errorf("lendo asset para sync: %w", err)
		}
		changes = append(changes, buildAssetChange(assetChangeData{
			id: id, orgID: orgID2, assetTypeID: atID, assetTypeName: atName,
			latitude: latitude, longitude: longitude, gpsAccuracyM: gpsAccuracyM,
			qrCode: qrCode, status: status, version: version, parentID: parentID,
			rejectionReason: rejectionReason, notes: notes, createdBy: createdBy,
			approvedBy: approvedBy, updatedAt: updatedAt, createdAt: createdAt,
			deletedAt: deletedAt,
		}))
	}
	return changes, rows.Err()
}

type assetChangeData struct {
	id, orgID, assetTypeID, assetTypeName string
	latitude, longitude                   float64
	gpsAccuracyM                          *float32
	qrCode, status, createdBy             string
	version                               int
	parentID, rejectionReason, notes      *string
	approvedBy                            *string
	updatedAt, createdAt                  time.Time
	deletedAt                             *time.Time
}

func buildAssetChange(a assetChangeData) Change {
	changeAt := a.updatedAt
	action := ChangeUpdate
	if a.deletedAt != nil {
		action = ChangeDelete
		changeAt = *a.deletedAt
	} else if a.createdAt.Equal(a.updatedAt) {
		action = ChangeCreate
	}

	var data json.RawMessage
	if a.deletedAt != nil {
		data, _ = json.Marshal(map[string]string{"id": a.id})
	} else {
		data, _ = json.Marshal(map[string]any{
			"id":               a.id,
			"organization_id":  a.orgID,
			"asset_type_id":    a.assetTypeID,
			"asset_type_name":  a.assetTypeName,
			"latitude":         a.latitude,
			"longitude":        a.longitude,
			"gps_accuracy_m":   a.gpsAccuracyM,
			"qr_code":          a.qrCode,
			"status":           a.status,
			"version":          a.version,
			"parent_id":        a.parentID,
			"rejection_reason": a.rejectionReason,
			"notes":            a.notes,
			"created_by":       a.createdBy,
			"approved_by":      a.approvedBy,
			"updated_at":       a.updatedAt,
			"created_at":       a.createdAt,
		})
	}

	return Change{EntityType: "asset", EntityID: a.id, Action: action, Data: data, UpdatedAt: changeAt}
}

// pullManejos retorna manejos alterados (incluindo soft-deleted) desde since.
func (r *syncRepository) pullManejos(ctx context.Context, orgID string, since time.Time) ([]Change, error) {
	query := `
		SELECT id, organization_id, asset_id, description, status,
		       updated_at, created_at, deleted_at
		FROM manejos
		WHERE organization_id = $1
		  AND (updated_at > $2 OR (deleted_at IS NOT NULL AND deleted_at > $2))
	`
	rows, err := r.db.QueryContext(ctx, query, orgID, since)
	if err != nil {
		return nil, fmt.Errorf("pull manejos: %w", err)
	}
	defer rows.Close()

	var changes []Change
	for rows.Next() {
		var (
			id, orgID2, assetID, description, status string
			updatedAt, createdAt                     time.Time
			deletedAt                                *time.Time
		)
		if err := rows.Scan(&id, &orgID2, &assetID, &description, &status,
			&updatedAt, &createdAt, &deletedAt); err != nil {
			return nil, fmt.Errorf("lendo manejo para sync: %w", err)
		}
		changes = append(changes, buildManejoChange(id, orgID2, assetID, description, status, updatedAt, createdAt, deletedAt))
	}
	return changes, rows.Err()
}

func buildManejoChange(id, orgID, assetID, description, status string,
	updatedAt, createdAt time.Time, deletedAt *time.Time) Change {

	changeAt := updatedAt
	action := ChangeUpdate
	if deletedAt != nil {
		action = ChangeDelete
		changeAt = *deletedAt
	} else if createdAt.Equal(updatedAt) {
		action = ChangeCreate
	}

	var data json.RawMessage
	if deletedAt != nil {
		data, _ = json.Marshal(map[string]string{"id": id})
	} else {
		data, _ = json.Marshal(map[string]any{
			"id":              id,
			"organization_id": orgID,
			"asset_id":        assetID,
			"description":     description,
			"status":          status,
			"updated_at":      updatedAt,
			"created_at":      createdAt,
		})
	}

	return Change{EntityType: "manejo", EntityID: id, Action: action, Data: data, UpdatedAt: changeAt}
}

// pullMonitoramentos retorna monitoramentos alterados (incluindo soft-deleted) desde since.
func (r *syncRepository) pullMonitoramentos(ctx context.Context, orgID string, since time.Time) ([]Change, error) {
	query := `
		SELECT id, organization_id, asset_id, notes, health_status, status,
		       updated_at, created_at, deleted_at
		FROM monitoramentos
		WHERE organization_id = $1
		  AND (updated_at > $2 OR (deleted_at IS NOT NULL AND deleted_at > $2))
	`
	rows, err := r.db.QueryContext(ctx, query, orgID, since)
	if err != nil {
		return nil, fmt.Errorf("pull monitoramentos: %w", err)
	}
	defer rows.Close()

	var changes []Change
	for rows.Next() {
		var (
			id, orgID2, assetID, notes, healthStatus, status string
			updatedAt, createdAt                             time.Time
			deletedAt                                        *time.Time
		)
		if err := rows.Scan(&id, &orgID2, &assetID, &notes, &healthStatus, &status,
			&updatedAt, &createdAt, &deletedAt); err != nil {
			return nil, fmt.Errorf("lendo monitoramento para sync: %w", err)
		}
		changes = append(changes, buildMonitoramentoChange(id, orgID2, assetID, notes, healthStatus, status, updatedAt, createdAt, deletedAt))
	}
	return changes, rows.Err()
}

func buildMonitoramentoChange(id, orgID, assetID, notes, healthStatus, status string,
	updatedAt, createdAt time.Time, deletedAt *time.Time) Change {

	changeAt := updatedAt
	action := ChangeUpdate
	if deletedAt != nil {
		action = ChangeDelete
		changeAt = *deletedAt
	} else if createdAt.Equal(updatedAt) {
		action = ChangeCreate
	}

	var data json.RawMessage
	if deletedAt != nil {
		data, _ = json.Marshal(map[string]string{"id": id})
	} else {
		data, _ = json.Marshal(map[string]any{
			"id":              id,
			"organization_id": orgID,
			"asset_id":        assetID,
			"notes":           notes,
			"health_status":   healthStatus,
			"status":          status,
			"updated_at":      updatedAt,
			"created_at":      createdAt,
		})
	}

	return Change{EntityType: "monitoramento", EntityID: id, Action: action, Data: data, UpdatedAt: changeAt}
}

// shouldInclude retorna true se entityType deve ser incluído conforme o filtro.
// Se o filtro estiver vazio, inclui todos.
func shouldInclude(filter []string, entityType string) bool {
	if len(filter) == 0 {
		return true
	}
	for _, t := range filter {
		if t == entityType {
			return true
		}
	}
	return false
}

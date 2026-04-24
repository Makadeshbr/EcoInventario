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
		SELECT id, organization_id, asset_type_id, status, version, notes,
		       updated_at, created_at, deleted_at
		FROM assets
		WHERE organization_id = $1
		  AND (updated_at > $2 OR (deleted_at IS NOT NULL AND deleted_at > $2))
	`
	rows, err := r.db.QueryContext(ctx, query, orgID, since)
	if err != nil {
		return nil, fmt.Errorf("pull assets: %w", err)
	}
	defer rows.Close()

	var changes []Change
	for rows.Next() {
		var (
			id, orgID2, atID, status string
			version                  int
			notes                    *string
			updatedAt, createdAt     time.Time
			deletedAt                *time.Time
		)
		if err := rows.Scan(&id, &orgID2, &atID, &status, &version, &notes,
			&updatedAt, &createdAt, &deletedAt); err != nil {
			return nil, fmt.Errorf("lendo asset para sync: %w", err)
		}
		changes = append(changes, buildAssetChange(id, orgID2, atID, status, version, notes, updatedAt, createdAt, deletedAt))
	}
	return changes, rows.Err()
}

func buildAssetChange(id, orgID, atID, status string, version int, notes *string,
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
			"asset_type_id":   atID,
			"status":          status,
			"version":         version,
			"notes":           notes,
			"updated_at":      updatedAt,
			"created_at":      createdAt,
		})
	}

	return Change{EntityType: "asset", EntityID: id, Action: action, Data: data, UpdatedAt: changeAt}
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

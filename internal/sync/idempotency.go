package sync

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// IdempotencyRecord armazena o resultado de uma operação já processada.
type IdempotencyRecord struct {
	IdempotencyKey string
	EntityType     string
	EntityID       string
	Result         json.RawMessage
	CreatedAt      time.Time
}

// IdempotencyRepository gerencia chaves de idempotência.
type IdempotencyRepository interface {
	Find(ctx context.Context, key string) (*IdempotencyRecord, error)
	Store(ctx context.Context, rec *IdempotencyRecord) error
	Cleanup(ctx context.Context, olderThan time.Time) (int64, error)
}

type idempotencyRepository struct {
	db *sql.DB
}

// NewIdempotencyRepository cria o repositório de idempotência.
func NewIdempotencyRepository(db *sql.DB) IdempotencyRepository {
	return &idempotencyRepository{db: db}
}

func (r *idempotencyRepository) Find(ctx context.Context, key string) (*IdempotencyRecord, error) {
	query := `
		SELECT idempotency_key, entity_type, entity_id, result, created_at
		FROM processed_idempotency_keys
		WHERE idempotency_key = $1
	`
	rec := &IdempotencyRecord{}
	err := r.db.QueryRowContext(ctx, query, key).Scan(
		&rec.IdempotencyKey, &rec.EntityType, &rec.EntityID, &rec.Result, &rec.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("buscando idempotency key: %w", err)
	}
	return rec, nil
}

func (r *idempotencyRepository) Store(ctx context.Context, rec *IdempotencyRecord) error {
	query := `
		INSERT INTO processed_idempotency_keys (idempotency_key, entity_type, entity_id, result)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (idempotency_key) DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query, rec.IdempotencyKey, rec.EntityType, rec.EntityID, rec.Result)
	if err != nil {
		return fmt.Errorf("armazenando idempotency key: %w", err)
	}
	return nil
}

// Cleanup remove chaves mais antigas que olderThan. Chamado periodicamente.
func (r *idempotencyRepository) Cleanup(ctx context.Context, olderThan time.Time) (int64, error) {
	query := `DELETE FROM processed_idempotency_keys WHERE created_at < $1`
	res, err := r.db.ExecContext(ctx, query, olderThan)
	if err != nil {
		return 0, fmt.Errorf("limpando idempotency keys: %w", err)
	}
	n, _ := res.RowsAffected()
	return n, nil
}

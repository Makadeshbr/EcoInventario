package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// Repository define as operações de banco necessárias para auth.
type Repository interface {
	FindUserByEmail(ctx context.Context, email string) (*UserRecord, error)
	FindUserByID(ctx context.Context, id string) (*UserRecord, error)
	InsertRefreshToken(ctx context.Context, rt *RefreshTokenRecord) error
	FindRefreshToken(ctx context.Context, tokenHash string) (*RefreshTokenRecord, error)
	RevokeRefreshToken(ctx context.Context, tokenHash string) error
	RevokeFamily(ctx context.Context, familyID string) error
}

type repository struct {
	db *sql.DB
}

// NewRepository cria repositório de auth backed por PostgreSQL.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindUserByID(ctx context.Context, id string) (*UserRecord, error) {
	query := `
		SELECT id, organization_id, name, email, password_hash, role, is_active
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
		LIMIT 1
	`
	u := &UserRecord{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.OrganizationID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.IsActive,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("buscando usuário por id: %w", err)
	}
	return u, nil
}

func (r *repository) FindUserByEmail(ctx context.Context, email string) (*UserRecord, error) {
	query := `
		SELECT id, organization_id, name, email, password_hash, role, is_active
		FROM users
		WHERE email = $1 AND deleted_at IS NULL
		LIMIT 1
	`
	u := &UserRecord{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&u.ID, &u.OrganizationID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.IsActive,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("buscando usuário por email: %w", err)
	}
	return u, nil
}

func (r *repository) InsertRefreshToken(ctx context.Context, rt *RefreshTokenRecord) error {
	query := `
		INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, is_revoked, expires_at)
		VALUES ($1, $2, $3, $4, false, $5)
	`
	_, err := r.db.ExecContext(ctx, query, rt.ID, rt.UserID, rt.TokenHash, rt.FamilyID, rt.ExpiresAt)
	if err != nil {
		return fmt.Errorf("inserindo refresh token: %w", err)
	}
	return nil
}

func (r *repository) FindRefreshToken(ctx context.Context, tokenHash string) (*RefreshTokenRecord, error) {
	query := `
		SELECT id, user_id, token_hash, family_id, is_revoked, expires_at
		FROM refresh_tokens
		WHERE token_hash = $1
	`
	rt := &RefreshTokenRecord{}
	var expiresAt time.Time
	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(
		&rt.ID, &rt.UserID, &rt.TokenHash, &rt.FamilyID, &rt.IsRevoked, &expiresAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, apperror.NewNotFound("refresh_token", tokenHash)
	}
	if err != nil {
		return nil, fmt.Errorf("buscando refresh token: %w", err)
	}
	rt.ExpiresAt = expiresAt
	return rt, nil
}

func (r *repository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	query := `UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1`
	_, err := r.db.ExecContext(ctx, query, tokenHash)
	if err != nil {
		return fmt.Errorf("revogando refresh token: %w", err)
	}
	return nil
}

func (r *repository) RevokeFamily(ctx context.Context, familyID string) error {
	query := `UPDATE refresh_tokens SET is_revoked = true WHERE family_id = $1`
	_, err := r.db.ExecContext(ctx, query, familyID)
	if err != nil {
		return fmt.Errorf("revogando família de tokens: %w", err)
	}
	return nil
}

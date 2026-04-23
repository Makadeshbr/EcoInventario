package user

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// Repository define operações de banco para usuários.
type Repository interface {
	FindByID(ctx context.Context, id, orgID string) (*User, error)
	FindByEmail(ctx context.Context, email, orgID string) (*User, error)
	Insert(ctx context.Context, u *User) error
	Update(ctx context.Context, u *User) error
	SoftDelete(ctx context.Context, id, orgID string) error
	List(ctx context.Context, f ListFilters) ([]*User, error)
}

type repository struct {
	db *sql.DB
}

// NewRepository cria repositório de usuários.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindByID(ctx context.Context, id, orgID string) (*User, error) {
	query := `
		SELECT id, organization_id, name, email, password_hash, role, is_active, created_at, updated_at
		FROM users
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	return r.scanOne(r.db.QueryRowContext(ctx, query, id, orgID))
}

func (r *repository) FindByEmail(ctx context.Context, email, orgID string) (*User, error) {
	query := `
		SELECT id, organization_id, name, email, password_hash, role, is_active, created_at, updated_at
		FROM users
		WHERE email = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	return r.scanOne(r.db.QueryRowContext(ctx, query, email, orgID))
}

func (r *repository) Insert(ctx context.Context, u *User) error {
	query := `
		INSERT INTO users (organization_id, name, email, password_hash, role, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		u.OrganizationID, u.Name, u.Email, u.PasswordHash, u.Role, u.IsActive,
	).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
}

func (r *repository) Update(ctx context.Context, u *User) error {
	query := `
		UPDATE users
		SET name = $1, role = $2, is_active = $3, updated_at = now()
		WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
		RETURNING updated_at
	`
	err := r.db.QueryRowContext(ctx, query,
		u.Name, u.Role, u.IsActive, u.ID, u.OrganizationID,
	).Scan(&u.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("usuário não encontrado para update")
	}
	return err
}

func (r *repository) SoftDelete(ctx context.Context, id, orgID string) error {
	query := `
		UPDATE users SET deleted_at = now()
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	res, err := r.db.ExecContext(ctx, query, id, orgID)
	if err != nil {
		return fmt.Errorf("soft delete usuário: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("usuário não encontrado")
	}
	return nil
}

func (r *repository) List(ctx context.Context, f ListFilters) ([]*User, error) {
	args := []any{f.Limit, f.OrgID}
	conditions := []string{"organization_id = $2", "deleted_at IS NULL"}
	n := 3

	if f.Cursor != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(created_at, id) > (SELECT created_at, id FROM users WHERE id = $%d AND organization_id = $2 AND deleted_at IS NULL)",
			n,
		))
		args = append(args, f.Cursor)
		n++
	}
	if f.Role != "" {
		conditions = append(conditions, fmt.Sprintf("role = $%d", n))
		args = append(args, f.Role)
		n++
	}
	if f.IsActive != nil {
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", n))
		args = append(args, *f.IsActive)
	}

	query := fmt.Sprintf(`
		SELECT id, organization_id, name, email, password_hash, role, is_active, created_at, updated_at
		FROM users
		WHERE %s
		ORDER BY created_at ASC, id ASC
		LIMIT $1
	`, strings.Join(conditions, " AND "))

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("listando usuários: %w", err)
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		u := &User{}
		if err := rows.Scan(&u.ID, &u.OrganizationID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("lendo usuário: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *repository) scanOne(row *sql.Row) (*User, error) {
	u := &User{}
	err := row.Scan(&u.ID, &u.OrganizationID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lendo usuário: %w", err)
	}
	return u, nil
}

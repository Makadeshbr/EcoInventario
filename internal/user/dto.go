package user

import "time"

// CreateRequest é o payload de POST /api/v1/users.
type CreateRequest struct {
	Name     string `json:"name"     validate:"required,min=2,max=200"`
	Email    string `json:"email"    validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,min=8"`
	Role     string `json:"role"     validate:"required,oneof=tech admin viewer"`
}

// UpdateRequest é o payload de PATCH /api/v1/users/{id} (campos opcionais).
type UpdateRequest struct {
	Name     *string `json:"name"      validate:"omitempty,min=2,max=200"`
	Role     *string `json:"role"      validate:"omitempty,oneof=tech admin viewer"`
	IsActive *bool   `json:"is_active"`
}

// ListFilters são os filtros opcionais para GET /api/v1/users.
// OrgID é preenchido pelo service a partir do JWT, nunca do request.
type ListFilters struct {
	OrgID    string
	Role     string
	IsActive *bool
	Cursor   string
	Limit    int
}

// UserResponse é o shape público de um usuário (sem password_hash).
type UserResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

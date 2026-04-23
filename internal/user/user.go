package user

import "time"

// User é o modelo de domínio do usuário.
type User struct {
	ID             string
	OrganizationID string
	Name           string
	Email          string
	PasswordHash   string
	Role           string
	IsActive       bool
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time
}

func (u *User) toResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Name:      u.Name,
		Email:     u.Email,
		Role:      u.Role,
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt,
	}
}

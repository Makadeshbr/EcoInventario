package auth

import "time"

// LoginRequest é o payload do POST /auth/login.
type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,min=8"`
}

// RefreshRequest é o payload do POST /auth/refresh.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// LogoutRequest é o payload do POST /auth/logout.
type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// LoginResponse é a resposta do POST /auth/login.
type LoginResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	ExpiresIn    int      `json:"expires_in"`
	User         UserInfo `json:"user"`
}

// RefreshResponse é a resposta do POST /auth/refresh.
type RefreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// UserInfo é o subset de dados do usuário retornado no login.
type UserInfo struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Email          string `json:"email"`
	Role           string `json:"role"`
	OrganizationID string `json:"organization_id"`
}

// UserRecord representa o usuário como lido do banco.
type UserRecord struct {
	ID             string
	OrganizationID string
	Name           string
	Email          string
	PasswordHash   string
	Role           string
	IsActive       bool
}

// RefreshTokenRecord representa o refresh token como lido do banco.
type RefreshTokenRecord struct {
	ID        string
	UserID    string
	TokenHash string
	FamilyID  string
	IsRevoked bool
	ExpiresAt time.Time
}

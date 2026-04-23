package auth_test

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"testing"
	"time"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/auth"
	"github.com/allan/ecoinventario/internal/shared"
)

// mockRepo implementa auth.Repository para testes
type mockRepo struct {
	user          *auth.UserRecord
	findErr       error
	savedToken    *auth.RefreshTokenRecord
	foundToken    *auth.RefreshTokenRecord
	findTokenErr  error
	revokedFamily string
	insertErr     error
}

func (m *mockRepo) FindUserByEmail(_ context.Context, email string) (*auth.UserRecord, error) {
	return m.user, m.findErr
}

func (m *mockRepo) FindUserByID(_ context.Context, id string) (*auth.UserRecord, error) {
	return m.user, m.findErr
}

func (m *mockRepo) InsertRefreshToken(_ context.Context, rt *auth.RefreshTokenRecord) error {
	m.savedToken = rt
	return m.insertErr
}

func (m *mockRepo) FindRefreshToken(_ context.Context, tokenHash string) (*auth.RefreshTokenRecord, error) {
	return m.foundToken, m.findTokenErr
}

func (m *mockRepo) RevokeRefreshToken(_ context.Context, tokenHash string) error {
	return nil
}

func (m *mockRepo) RevokeFamily(_ context.Context, familyID string) error {
	m.revokedFamily = familyID
	return nil
}

// noopAuditRepo descarta audit logs em testes
type noopAuditRepo struct{}

func (n *noopAuditRepo) Insert(_ context.Context, _ *audit.LogEntry) error { return nil }

func newTestService(t *testing.T, repo auth.Repository) *auth.Service {
	t.Helper()
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	privB64 := base64.StdEncoding.EncodeToString(priv)
	pubB64 := base64.StdEncoding.EncodeToString(pub)

	auditSvc := audit.NewService(&noopAuditRepo{})
	svc, err := auth.NewService(repo, auditSvc, "test-pepper", privB64, pubB64, 15*time.Minute, 720*time.Hour)
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}
	return svc
}

func TestServiceLogin(t *testing.T) {
	pepper := "test-pepper"

	hash, _ := auth.HashPassword("senha123", pepper)
	validUser := &auth.UserRecord{
		ID:             "user-123",
		OrganizationID: "org-456",
		Email:          "user@test.com",
		PasswordHash:   hash,
		Role:           shared.RoleTech,
		IsActive:       true,
	}

	t.Run("credenciais corretas retorna tokens e user", func(t *testing.T) {
		repo := &mockRepo{user: validUser}
		svc := newTestService(t, repo)

		resp, err := svc.Login(context.Background(), auth.LoginRequest{
			Email:    "user@test.com",
			Password: "senha123",
		})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp.AccessToken == "" {
			t.Error("access_token vazio")
		}
		if resp.RefreshToken == "" {
			t.Error("refresh_token vazio")
		}
		if resp.User.ID != "user-123" {
			t.Errorf("user.id: got %q, want %q", resp.User.ID, "user-123")
		}
		if resp.ExpiresIn != 900 {
			t.Errorf("expires_in: got %d, want 900", resp.ExpiresIn)
		}
	})

	t.Run("senha errada retorna 401", func(t *testing.T) {
		repo := &mockRepo{user: validUser}
		svc := newTestService(t, repo)

		_, err := svc.Login(context.Background(), auth.LoginRequest{
			Email:    "user@test.com",
			Password: "senhaerrada",
		})
		if err == nil {
			t.Fatal("esperava erro")
		}
	})

	t.Run("usuário não encontrado retorna 401 (sem revelar que não existe)", func(t *testing.T) {
		repo := &mockRepo{user: nil, findErr: nil}
		svc := newTestService(t, repo)

		_, err := svc.Login(context.Background(), auth.LoginRequest{
			Email:    "naoexiste@test.com",
			Password: "senha123",
		})
		if err == nil {
			t.Fatal("esperava erro")
		}
	})

	t.Run("usuário inativo retorna 401", func(t *testing.T) {
		inactiveUser := *validUser
		inactiveUser.IsActive = false
		repo := &mockRepo{user: &inactiveUser}
		svc := newTestService(t, repo)

		_, err := svc.Login(context.Background(), auth.LoginRequest{
			Email:    "user@test.com",
			Password: "senha123",
		})
		if err == nil {
			t.Fatal("esperava erro para usuário inativo")
		}
	})
}

func TestServiceRefreshToken(t *testing.T) {
	t.Run("refresh válido gera novo par e revoga o anterior", func(t *testing.T) {
		pepper := "test-pepper"
		hash, _ := auth.HashPassword("senha123", pepper)
		validUser := &auth.UserRecord{
			ID: "user-123", OrganizationID: "org-456",
			Email: "u@t.com", PasswordHash: hash,
			Role: shared.RoleTech, IsActive: true,
		}
		repo := &mockRepo{user: validUser}
		svc := newTestService(t, repo)

		loginResp, _ := svc.Login(context.Background(), auth.LoginRequest{Email: "u@t.com", Password: "senha123"})

		// configura repo para encontrar o token salvo no login
		savedToken := repo.savedToken
		repo.foundToken = savedToken

		resp, err := svc.RefreshToken(context.Background(), auth.RefreshRequest{
			RefreshToken: loginResp.RefreshToken,
		})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp.AccessToken == "" {
			t.Error("access_token vazio")
		}
		if resp.RefreshToken == "" {
			t.Error("refresh_token vazio")
		}
	})

	t.Run("token já revogado revoga a família inteira e retorna 401", func(t *testing.T) {
		revokedToken := &auth.RefreshTokenRecord{
			TokenHash: "hash-revogado",
			FamilyID:  "family-abc",
			IsRevoked: true,
			ExpiresAt: time.Now().Add(time.Hour),
		}
		repo := &mockRepo{foundToken: revokedToken}
		svc := newTestService(t, repo)

		_, err := svc.RefreshToken(context.Background(), auth.RefreshRequest{
			RefreshToken: "rt_algum-token",
		})
		if err == nil {
			t.Fatal("esperava erro")
		}
		if repo.revokedFamily != "family-abc" {
			t.Errorf("família não foi revogada: got %q", repo.revokedFamily)
		}
	})

	t.Run("token expirado retorna 401", func(t *testing.T) {
		expiredToken := &auth.RefreshTokenRecord{
			TokenHash: "hash-expirado",
			FamilyID:  "family-xyz",
			IsRevoked: false,
			ExpiresAt: time.Now().Add(-time.Hour),
		}
		repo := &mockRepo{foundToken: expiredToken}
		svc := newTestService(t, repo)

		_, err := svc.RefreshToken(context.Background(), auth.RefreshRequest{
			RefreshToken: "rt_algum-token",
		})
		if err == nil {
			t.Fatal("esperava erro para token expirado")
		}
	})
}

func TestServiceLogout(t *testing.T) {
	t.Run("logout revoga o refresh token", func(t *testing.T) {
		activeToken := &auth.RefreshTokenRecord{
			TokenHash: "hash-ativo",
			FamilyID:  "family-abc",
			IsRevoked: false,
			ExpiresAt: time.Now().Add(time.Hour),
			UserID:    "user-123",
		}
		repo := &mockRepo{foundToken: activeToken}
		svc := newTestService(t, repo)

		ctx := shared.WithUserID(context.Background(), "user-123")
		err := svc.Logout(ctx, auth.LogoutRequest{RefreshToken: "rt_algum-token"})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
	})
}

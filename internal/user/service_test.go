package user_test

import (
	"context"
	"fmt"
	"testing"

	"strings"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/auth"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/user"
	"github.com/jackc/pgx/v5/pgconn"
)

// --- mocks ---

type mockUserRepo struct {
	stored              *user.User
	findErr             error
	insertErr           error
	updateErr           error
	deleteErr           error
	emailExists         bool
	hasOtherActiveAdmin bool
	hasOtherAdminErr    error
	list                []*user.User
	updatedHash         string
}

// mockRevoker registra as revogacoes de sessao pedidas pelo service.
type mockRevoker struct {
	revokedUserIDs []string
	err            error
}

func (m *mockRevoker) RevokeAllForUser(_ context.Context, userID string) error {
	m.revokedUserIDs = append(m.revokedUserIDs, userID)
	return m.err
}

func (m *mockUserRepo) FindByID(_ context.Context, id, orgID string) (*user.User, error) {
	return m.stored, m.findErr
}

func (m *mockUserRepo) FindByEmail(_ context.Context, email, orgID string) (*user.User, error) {
	if m.emailExists {
		return &user.User{ID: "existing"}, nil
	}
	return nil, nil
}

func (m *mockUserRepo) Insert(_ context.Context, u *user.User) error {
	u.ID = "new-user-id"
	return m.insertErr
}

func (m *mockUserRepo) Update(_ context.Context, u *user.User) error {
	m.updatedHash = u.PasswordHash
	return m.updateErr
}

func (m *mockUserRepo) SoftDelete(_ context.Context, id, orgID string) error {
	return m.deleteErr
}

func (m *mockUserRepo) HasOtherActiveAdmin(_ context.Context, orgID, excludeUserID string) (bool, error) {
	return m.hasOtherActiveAdmin, m.hasOtherAdminErr
}

func (m *mockUserRepo) List(_ context.Context, f user.ListFilters) ([]*user.User, error) {
	return m.list, nil
}

type noopAudit struct{}

func (n *noopAudit) Insert(_ context.Context, _ *audit.LogEntry) error { return nil }

func (n *noopAudit) List(_ context.Context, _ string, _ audit.ListFilters) ([]*audit.LogEntry, error) {
	return nil, nil
}

func newTestSvc(repo user.Repository) *user.Service {
	svc, _ := newTestSvcWithRevoker(repo)
	return svc
}

func newTestSvcWithRevoker(repo user.Repository) (*user.Service, *mockRevoker) {
	auditSvc := audit.NewService(&noopAudit{})
	revoker := &mockRevoker{}
	return user.NewService(repo, auditSvc, "test-pepper", revoker), revoker
}

// --- testes ---

func TestUserServiceCreate(t *testing.T) {
	ctx := shared.WithOrgID(shared.WithUserID(context.Background(), "admin-id"), "org-1")

	t.Run("cria usuário com sucesso e hasheia senha", func(t *testing.T) {
		repo := &mockUserRepo{}
		svc := newTestSvc(repo)

		resp, err := svc.Create(ctx, user.CreateRequest{
			Name:     "João Silva",
			Email:    "joao@test.com",
			Password: "senha123",
			Role:     shared.RoleTech,
		})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp.ID == "" {
			t.Error("ID não gerado")
		}
		if resp.Email != "joao@test.com" {
			t.Errorf("email: got %q", resp.Email)
		}
	})

	t.Run("email duplicado na org retorna 409", func(t *testing.T) {
		repo := &mockUserRepo{emailExists: true}
		svc := newTestSvc(repo)

		_, err := svc.Create(ctx, user.CreateRequest{
			Name:     "Outro",
			Email:    "joao@test.com",
			Password: "senha123",
			Role:     shared.RoleTech,
		})
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 409)
	})

	t.Run("email duplicado por corrida no banco retorna 409", func(t *testing.T) {
		repo := &mockUserRepo{
			insertErr: fmt.Errorf("insert: %w", &pgconn.PgError{
				Code:           "23505",
				ConstraintName: "users_email_organization_id_active_key",
			}),
		}
		svc := newTestSvc(repo)

		_, err := svc.Create(ctx, user.CreateRequest{
			Name:     "Outro",
			Email:    "joao@test.com",
			Password: "senha123",
			Role:     shared.RoleTech,
		})
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 409)
	})
}

func TestUserServiceGetByID(t *testing.T) {
	ctx := shared.WithOrgID(context.Background(), "org-1")

	t.Run("retorna usuário quando encontrado", func(t *testing.T) {
		repo := &mockUserRepo{stored: &user.User{ID: "u-1", Name: "João", Email: "j@t.com", Role: shared.RoleTech, IsActive: true}}
		svc := newTestSvc(repo)

		resp, err := svc.GetByID(ctx, "u-1")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp.ID != "u-1" {
			t.Errorf("ID: got %q", resp.ID)
		}
	})

	t.Run("não encontrado retorna 404", func(t *testing.T) {
		repo := &mockUserRepo{stored: nil}
		svc := newTestSvc(repo)

		_, err := svc.GetByID(ctx, "nao-existe")
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 404)
	})

}

func TestUserServiceUpdate(t *testing.T) {
	ctx := shared.WithOrgID(shared.WithUserID(context.Background(), "admin-id"), "org-1")
	existing := &user.User{ID: "u-1", Name: "João", Email: "j@t.com", Role: shared.RoleTech, IsActive: true}

	t.Run("atualiza campos opcionais com sucesso", func(t *testing.T) {
		repo := &mockUserRepo{stored: existing}
		svc := newTestSvc(repo)

		name := "João Atualizado"
		resp, err := svc.Update(ctx, "u-1", user.UpdateRequest{Name: &name})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp.Name != "João Atualizado" {
			t.Errorf("name: got %q", resp.Name)
		}
	})

	t.Run("usuário não encontrado retorna 404", func(t *testing.T) {
		repo := &mockUserRepo{stored: nil}
		svc := newTestSvc(repo)

		name := "Novo Nome"
		_, err := svc.Update(ctx, "nao-existe", user.UpdateRequest{Name: &name})
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 404)
	})

	t.Run("bloqueia admin auto desativar", func(t *testing.T) {
		repo := &mockUserRepo{
			stored: &user.User{ID: "admin-id", Name: "Admin", Email: "admin@t.com", Role: shared.RoleAdmin, IsActive: true},
		}
		svc := newTestSvc(repo)

		inactive := false
		_, err := svc.Update(ctx, "admin-id", user.UpdateRequest{IsActive: &inactive})
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 403)
	})

	t.Run("bloqueia admin auto rebaixar role", func(t *testing.T) {
		repo := &mockUserRepo{
			stored: &user.User{ID: "admin-id", Name: "Admin", Email: "admin@t.com", Role: shared.RoleAdmin, IsActive: true},
		}
		svc := newTestSvc(repo)

		role := shared.RoleTech
		_, err := svc.Update(ctx, "admin-id", user.UpdateRequest{Role: &role})
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 403)
	})

	t.Run("bloqueia desativar ultimo admin ativo da org", func(t *testing.T) {
		repo := &mockUserRepo{
			stored:              &user.User{ID: "other-admin", Name: "Admin", Email: "admin@t.com", Role: shared.RoleAdmin, IsActive: true},
			hasOtherActiveAdmin: false,
		}
		svc := newTestSvc(repo)

		inactive := false
		_, err := svc.Update(ctx, "other-admin", user.UpdateRequest{IsActive: &inactive})
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 403)
	})

	t.Run("permite desativar admin quando existe outro admin ativo", func(t *testing.T) {
		repo := &mockUserRepo{
			stored:              &user.User{ID: "other-admin", Name: "Admin", Email: "admin@t.com", Role: shared.RoleAdmin, IsActive: true},
			hasOtherActiveAdmin: true,
		}
		svc := newTestSvc(repo)

		inactive := false
		resp, err := svc.Update(ctx, "other-admin", user.UpdateRequest{IsActive: &inactive})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp.IsActive {
			t.Fatal("esperava usuario inativo")
		}
	})
}

func TestUserServiceSoftDelete(t *testing.T) {
	ctx := shared.WithOrgID(shared.WithUserID(context.Background(), "admin-id"), "org-1")

	t.Run("soft delete com sucesso", func(t *testing.T) {
		repo := &mockUserRepo{stored: &user.User{ID: "u-1"}}
		svc := newTestSvc(repo)

		if err := svc.SoftDelete(ctx, "u-1"); err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
	})

	t.Run("não encontrado retorna 404", func(t *testing.T) {
		repo := &mockUserRepo{stored: nil}
		svc := newTestSvc(repo)

		err := svc.SoftDelete(ctx, "nao-existe")
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 404)
	})

	t.Run("bloqueia admin deletar a si mesmo", func(t *testing.T) {
		repo := &mockUserRepo{stored: &user.User{ID: "admin-id", Role: shared.RoleAdmin, IsActive: true}}
		svc := newTestSvc(repo)

		err := svc.SoftDelete(ctx, "admin-id")
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 403)
	})

	t.Run("bloqueia deletar ultimo admin ativo da org", func(t *testing.T) {
		repo := &mockUserRepo{
			stored:              &user.User{ID: "other-admin", Role: shared.RoleAdmin, IsActive: true},
			hasOtherActiveAdmin: false,
		}
		svc := newTestSvc(repo)

		err := svc.SoftDelete(ctx, "other-admin")
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 403)
	})
}

func TestUserServiceList(t *testing.T) {
	ctx := shared.WithOrgID(context.Background(), "org-1")

	t.Run("retorna lista paginada", func(t *testing.T) {
		users := []*user.User{
			{ID: "u-1", Name: "A", Email: "a@t.com", Role: shared.RoleTech, IsActive: true},
			{ID: "u-2", Name: "B", Email: "b@t.com", Role: shared.RoleAdmin, IsActive: true},
		}
		repo := &mockUserRepo{list: users}
		svc := newTestSvc(repo)

		result, err := svc.List(ctx, user.ListFilters{Limit: 20})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if len(result.Data) != 2 {
			t.Errorf("len(data): got %d, want 2", len(result.Data))
		}
	})
}

func assertAppError(t *testing.T, err error, wantStatus int) {
	t.Helper()
	appErr, ok := err.(*apperror.AppError)
	if !ok {
		t.Fatalf("esperava *apperror.AppError, got %T: %v", err, err)
	}
	if appErr.Status != wantStatus {
		t.Errorf("status: got %d, want %d", appErr.Status, wantStatus)
	}
}

// Reset de senha pelo admin: a senha nova precisa virar hash novo e derrubar
// as sessões existentes, senão um refresh token vazado sobrevive ao reset.
func TestUserServiceUpdatePassword(t *testing.T) {
	ctx := shared.WithOrgID(shared.WithUserID(context.Background(), "admin-id"), "org-1")

	newStoredUser := func() *user.User {
		return &user.User{
			ID: "u-1", Name: "João", Email: "j@t.com",
			Role: shared.RoleTech, IsActive: true, PasswordHash: "hash-antigo",
		}
	}

	t.Run("troca o hash e revoga as sessões do usuário", func(t *testing.T) {
		repo := &mockUserRepo{stored: newStoredUser()}
		svc, revoker := newTestSvcWithRevoker(repo)

		password := "novaSenhaSegura1"
		if _, err := svc.Update(ctx, "u-1", user.UpdateRequest{Password: &password}); err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}

		if repo.updatedHash == "" || repo.updatedHash == "hash-antigo" {
			t.Errorf("hash não foi regravado: got %q", repo.updatedHash)
		}
		if strings.Contains(repo.updatedHash, password) {
			t.Error("hash contém a senha em texto puro")
		}
		if len(revoker.revokedUserIDs) != 1 || revoker.revokedUserIDs[0] != "u-1" {
			t.Errorf("sessões não revogadas para o usuário: got %v", revoker.revokedUserIDs)
		}
	})

	t.Run("a senha nova autentica no hash gravado", func(t *testing.T) {
		repo := &mockUserRepo{stored: newStoredUser()}
		svc, _ := newTestSvcWithRevoker(repo)

		password := "novaSenhaSegura1"
		if _, err := svc.Update(ctx, "u-1", user.UpdateRequest{Password: &password}); err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}

		ok, err := auth.VerifyPassword(password, repo.updatedHash, "test-pepper")
		if err != nil {
			t.Fatalf("erro verificando senha: %v", err)
		}
		if !ok {
			t.Error("senha nova não confere com o hash gravado")
		}
	})

	t.Run("update sem senha não mexe no hash nem revoga sessões", func(t *testing.T) {
		repo := &mockUserRepo{stored: newStoredUser()}
		svc, revoker := newTestSvcWithRevoker(repo)

		name := "João Atualizado"
		if _, err := svc.Update(ctx, "u-1", user.UpdateRequest{Name: &name}); err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}

		if repo.updatedHash != "hash-antigo" {
			t.Errorf("hash foi alterado sem pedido: got %q", repo.updatedHash)
		}
		if len(revoker.revokedUserIDs) != 0 {
			t.Errorf("revogou sessões sem troca de senha: %v", revoker.revokedUserIDs)
		}
	})

	t.Run("falha ao revogar sessões propaga erro", func(t *testing.T) {
		repo := &mockUserRepo{stored: newStoredUser()}
		auditSvc := audit.NewService(&noopAudit{})
		revoker := &mockRevoker{err: fmt.Errorf("banco fora")}
		svc := user.NewService(repo, auditSvc, "test-pepper", revoker)

		password := "novaSenhaSegura1"
		_, err := svc.Update(ctx, "u-1", user.UpdateRequest{Password: &password})
		if err == nil {
			t.Fatal("esperava erro quando a revogação falha")
		}
	})

	t.Run("auditoria registra a troca sem gravar a senha", func(t *testing.T) {
		repo := &mockUserRepo{stored: newStoredUser()}
		capture := &capturingAudit{}
		revoker := &mockRevoker{}
		svc := user.NewService(repo, audit.NewService(capture), "test-pepper", revoker)

		password := "novaSenhaSegura1"
		if _, err := svc.Update(ctx, "u-1", user.UpdateRequest{Password: &password}); err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}

		if len(capture.entries) == 0 {
			t.Fatal("nenhuma entrada de auditoria registrada")
		}
		changes := string(capture.entries[0].Changes)
		if !strings.Contains(changes, "password") {
			t.Errorf("auditoria não registrou a troca de senha: %s", changes)
		}
		if strings.Contains(changes, password) {
			t.Errorf("auditoria vazou a senha em texto puro: %s", changes)
		}
	})
}

// capturingAudit guarda as entradas para inspeção nos testes.
type capturingAudit struct {
	entries []*audit.LogEntry
}

func (c *capturingAudit) Insert(_ context.Context, e *audit.LogEntry) error {
	c.entries = append(c.entries, e)
	return nil
}

func (c *capturingAudit) List(_ context.Context, _ string, _ audit.ListFilters) ([]*audit.LogEntry, error) {
	return nil, nil
}

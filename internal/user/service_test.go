package user_test

import (
	"context"
	"testing"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/user"
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
	auditSvc := audit.NewService(&noopAudit{})
	return user.NewService(repo, auditSvc, "test-pepper")
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

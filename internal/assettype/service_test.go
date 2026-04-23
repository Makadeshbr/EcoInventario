package assettype_test

import (
	"context"
	"testing"

	"github.com/allan/ecoinventario/internal/assettype"
	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// --- mocks ---

type mockAssetTypeRepo struct {
	stored      *assettype.AssetType
	findErr     error
	insertErr   error
	updateErr   error
	nameExists  bool
	list        []*assettype.AssetType
}

func (m *mockAssetTypeRepo) FindByID(_ context.Context, id, orgID string) (*assettype.AssetType, error) {
	return m.stored, m.findErr
}

func (m *mockAssetTypeRepo) FindByName(_ context.Context, name, orgID string) (*assettype.AssetType, error) {
	if m.nameExists {
		return &assettype.AssetType{ID: "existing"}, nil
	}
	return nil, nil
}

func (m *mockAssetTypeRepo) Insert(_ context.Context, at *assettype.AssetType) error {
	at.ID = "new-at-id"
	return m.insertErr
}

func (m *mockAssetTypeRepo) Update(_ context.Context, at *assettype.AssetType) error {
	return m.updateErr
}

func (m *mockAssetTypeRepo) List(_ context.Context, orgID string) ([]*assettype.AssetType, error) {
	return m.list, nil
}

type noopAudit struct{}

func (n *noopAudit) Insert(_ context.Context, _ *audit.LogEntry) error { return nil }

func newTestSvc(repo assettype.Repository) *assettype.Service {
	auditSvc := audit.NewService(&noopAudit{})
	return assettype.NewService(repo, auditSvc)
}

// --- testes ---

func TestAssetTypeServiceCreate(t *testing.T) {
	ctx := shared.WithOrgID(shared.WithUserID(context.Background(), "admin-id"), "org-1")

	t.Run("cria tipo com sucesso", func(t *testing.T) {
		repo := &mockAssetTypeRepo{}
		svc := newTestSvc(repo)

		desc := "Espécime arbóreo"
		resp, err := svc.Create(ctx, assettype.CreateRequest{
			Name:        "Árvore",
			Description: &desc,
		})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp.Name != "Árvore" {
			t.Errorf("name: got %q", resp.Name)
		}
	})

	t.Run("nome duplicado na org retorna 409", func(t *testing.T) {
		repo := &mockAssetTypeRepo{nameExists: true}
		svc := newTestSvc(repo)

		_, err := svc.Create(ctx, assettype.CreateRequest{Name: "Árvore"})
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 409)
	})
}

func TestAssetTypeServiceGetByID(t *testing.T) {
	ctx := shared.WithOrgID(context.Background(), "org-1")

	t.Run("retorna tipo quando encontrado", func(t *testing.T) {
		repo := &mockAssetTypeRepo{stored: &assettype.AssetType{ID: "at-1", Name: "Árvore", IsActive: true}}
		svc := newTestSvc(repo)

		resp, err := svc.GetByID(ctx, "at-1")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp.ID != "at-1" {
			t.Errorf("ID: got %q", resp.ID)
		}
	})

	t.Run("não encontrado retorna 404", func(t *testing.T) {
		repo := &mockAssetTypeRepo{stored: nil}
		svc := newTestSvc(repo)

		_, err := svc.GetByID(ctx, "nao-existe")
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 404)
	})
}

func TestAssetTypeServiceUpdate(t *testing.T) {
	ctx := shared.WithOrgID(shared.WithUserID(context.Background(), "admin-id"), "org-1")
	existing := &assettype.AssetType{ID: "at-1", Name: "Árvore", IsActive: true}

	t.Run("atualiza com sucesso", func(t *testing.T) {
		repo := &mockAssetTypeRepo{stored: existing}
		svc := newTestSvc(repo)

		name := "Árvore Atualizada"
		resp, err := svc.Update(ctx, "at-1", assettype.UpdateRequest{Name: &name})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp.Name != "Árvore Atualizada" {
			t.Errorf("name: got %q", resp.Name)
		}
	})

	t.Run("nome duplicado ao atualizar retorna 409", func(t *testing.T) {
		repo := &mockAssetTypeRepo{stored: existing, nameExists: true}
		svc := newTestSvc(repo)

		name := "Colônia" // nome já existe em outra entrada
		_, err := svc.Update(ctx, "at-1", assettype.UpdateRequest{Name: &name})
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 409)
	})

	t.Run("não encontrado retorna 404", func(t *testing.T) {
		repo := &mockAssetTypeRepo{stored: nil}
		svc := newTestSvc(repo)

		name := "Novo"
		_, err := svc.Update(ctx, "nao-existe", assettype.UpdateRequest{Name: &name})
		if err == nil {
			t.Fatal("esperava erro")
		}
		assertAppError(t, err, 404)
	})
}

func TestAssetTypeServiceList(t *testing.T) {
	ctx := shared.WithOrgID(context.Background(), "org-1")

	t.Run("retorna lista de tipos da org", func(t *testing.T) {
		types := []*assettype.AssetType{
			{ID: "at-1", Name: "Árvore", IsActive: true},
			{ID: "at-2", Name: "Colônia", IsActive: true},
		}
		repo := &mockAssetTypeRepo{list: types}
		svc := newTestSvc(repo)

		result, err := svc.List(ctx)
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if len(result) != 2 {
			t.Errorf("len: got %d, want 2", len(result))
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

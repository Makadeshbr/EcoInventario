package organization_test

import (
	"context"
	"testing"

	"github.com/allan/ecoinventario/internal/organization"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

type mockOrgRepo struct {
	org    *organization.Organization
	findErr error
}

func (m *mockOrgRepo) FindByID(_ context.Context, id string) (*organization.Organization, error) {
	return m.org, m.findErr
}

func (m *mockOrgRepo) FindBySlug(_ context.Context, slug string) (*organization.Organization, error) {
	return m.org, m.findErr
}

func TestOrganizationServiceGetByID(t *testing.T) {
	org := &organization.Organization{
		ID:   "org-1",
		Name: "Org Teste",
		Slug: "org-teste",
	}

	t.Run("retorna org quando encontrada", func(t *testing.T) {
		svc := organization.NewService(&mockOrgRepo{org: org})
		got, err := svc.GetByID(context.Background(), "org-1")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if got.ID != "org-1" {
			t.Errorf("ID: got %q, want %q", got.ID, "org-1")
		}
	})

	t.Run("retorna 404 quando não encontrada", func(t *testing.T) {
		svc := organization.NewService(&mockOrgRepo{org: nil})
		_, err := svc.GetByID(context.Background(), "nao-existe")
		if err == nil {
			t.Fatal("esperava erro")
		}
		var appErr *apperror.AppError
		if !isAppError(err, &appErr) || appErr.Status != 404 {
			t.Errorf("esperava 404, got: %v", err)
		}
	})
}

func isAppError(err error, target **apperror.AppError) bool {
	if e, ok := err.(*apperror.AppError); ok {
		*target = e
		return true
	}
	return false
}

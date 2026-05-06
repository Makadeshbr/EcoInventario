package user

import (
	"testing"

	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

func TestAdminMutationPolicy(t *testing.T) {
	policy := adminMutationPolicy{}
	admin := &User{ID: "admin-1", Role: shared.RoleAdmin, IsActive: true}
	tech := &User{ID: "tech-1", Role: shared.RoleTech, IsActive: true}

	t.Run("bloqueia auto desativacao", func(t *testing.T) {
		inactive := false
		err := policy.ValidateSelfUpdate("admin-1", admin, UpdateRequest{IsActive: &inactive})
		assertPolicyForbidden(t, err)
	})

	t.Run("bloqueia auto rebaixamento", func(t *testing.T) {
		role := shared.RoleTech
		err := policy.ValidateSelfUpdate("admin-1", admin, UpdateRequest{Role: &role})
		assertPolicyForbidden(t, err)
	})

	t.Run("bloqueia auto delete", func(t *testing.T) {
		err := policy.ValidateSelfDelete("admin-1", admin)
		assertPolicyForbidden(t, err)
	})

	t.Run("detecta update que remove admin ativo da org", func(t *testing.T) {
		inactive := false
		if !policy.UpdateRequiresOtherActiveAdmin(admin, UpdateRequest{IsActive: &inactive}) {
			t.Fatal("esperava exigir outro admin ativo")
		}

		role := shared.RoleViewer
		if !policy.UpdateRequiresOtherActiveAdmin(admin, UpdateRequest{Role: &role}) {
			t.Fatal("esperava exigir outro admin ativo")
		}
	})

	t.Run("nao exige outro admin para update de tecnico", func(t *testing.T) {
		inactive := false
		if policy.UpdateRequiresOtherActiveAdmin(tech, UpdateRequest{IsActive: &inactive}) {
			t.Fatal("nao esperava exigir outro admin ativo")
		}
	})

	t.Run("mantem pelo menos um admin ativo", func(t *testing.T) {
		assertPolicyForbidden(t, policy.ValidateOrganizationKeepsAdmin(false))
		if err := policy.ValidateOrganizationKeepsAdmin(true); err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
	})
}

func assertPolicyForbidden(t *testing.T, err error) {
	t.Helper()
	appErr, ok := err.(*apperror.AppError)
	if !ok {
		t.Fatalf("esperava AppError, got %T: %v", err, err)
	}
	if appErr.Status != 403 {
		t.Fatalf("status: got %d, want 403", appErr.Status)
	}
}

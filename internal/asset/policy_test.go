package asset

import (
	"testing"

	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

func TestAssetMutationPolicy(t *testing.T) {
	policy := assetMutationPolicy{}

	t.Run("viewer nao acessa asset nao approved", func(t *testing.T) {
		err := policy.ValidateViewerAccess(shared.RoleViewer, &Asset{Status: shared.StatusPending}, "asset-1")
		assertPolicyStatus(t, err, 404)
	})

	t.Run("admin acessa asset nao approved", func(t *testing.T) {
		err := policy.ValidateViewerAccess(shared.RoleAdmin, &Asset{Status: shared.StatusPending}, "asset-1")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
	})

	t.Run("approved exige nova versao e admin", func(t *testing.T) {
		mode, err := policy.ValidateUpdate(&Asset{Status: shared.StatusApproved}, shared.RoleAdmin, "admin-1")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if mode != assetUpdateNewVersion {
			t.Fatalf("mode: got %v, want new version", mode)
		}
	})

	t.Run("tech nao edita approved", func(t *testing.T) {
		_, err := policy.ValidateUpdate(&Asset{Status: shared.StatusApproved}, shared.RoleTech, "tech-1")
		assertPolicyStatus(t, err, 403)
	})

	t.Run("tech so edita proprio draft", func(t *testing.T) {
		_, err := policy.ValidateUpdate(
			&Asset{Status: shared.StatusDraft, CreatedBy: "other-tech"},
			shared.RoleTech,
			"tech-1",
		)
		assertPolicyStatus(t, err, 403)
	})

	t.Run("soft delete exige draft", func(t *testing.T) {
		err := policy.ValidateSoftDelete(&Asset{Status: shared.StatusPending}, shared.RoleAdmin, "admin-1")
		assertPolicyStatus(t, err, 422)
	})

	t.Run("submit aceita draft", func(t *testing.T) {
		err := policy.ValidateSubmit(&Asset{Status: shared.StatusDraft, CreatedBy: "admin-1"}, shared.RoleAdmin, "admin-1")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
	})

	t.Run("submit aceita rejected (re-submissão após correção)", func(t *testing.T) {
		err := policy.ValidateSubmit(&Asset{Status: shared.StatusRejected, CreatedBy: "admin-1"}, shared.RoleAdmin, "admin-1")
		if err != nil {
			t.Fatalf("erro inesperado para re-submissão: %v", err)
		}
	})

	t.Run("submit bloqueia approved", func(t *testing.T) {
		err := policy.ValidateSubmit(&Asset{Status: shared.StatusApproved}, shared.RoleAdmin, "admin-1")
		assertPolicyStatus(t, err, 409)
	})

	t.Run("submit bloqueia pending", func(t *testing.T) {
		err := policy.ValidateSubmit(&Asset{Status: shared.StatusPending}, shared.RoleAdmin, "admin-1")
		assertPolicyStatus(t, err, 409)
	})

	t.Run("approve exige admin", func(t *testing.T) {
		err := policy.ValidateApprove(&Asset{Status: shared.StatusPending}, shared.RoleTech)
		assertPolicyStatus(t, err, 403)
	})

	t.Run("reject exige pending", func(t *testing.T) {
		err := policy.ValidateReject(&Asset{Status: shared.StatusApproved}, shared.RoleAdmin)
		assertPolicyStatus(t, err, 409)
	})
}

func assertPolicyStatus(t *testing.T, err error, want int) {
	t.Helper()
	if err == nil {
		t.Fatal("esperava erro, got nil")
	}
	appErr, ok := err.(*apperror.AppError)
	if !ok {
		t.Fatalf("esperava *apperror.AppError, got %T: %v", err, err)
	}
	if appErr.Status != want {
		t.Fatalf("status: got %d, want %d", appErr.Status, want)
	}
}

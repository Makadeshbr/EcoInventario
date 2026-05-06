package monitoramento

import (
	"testing"

	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

func TestMonitoramentoMutationPolicy(t *testing.T) {
	policy := monitoramentoMutationPolicy{}

	t.Run("viewer não acessa monitoramento não approved", func(t *testing.T) {
		err := policy.ValidateViewerAccess(shared.RoleViewer, &Monitoramento{Status: shared.StatusPending}, "mon-1")
		assertPolicyStatus(t, err, 404)
	})

	t.Run("admin acessa monitoramento não approved", func(t *testing.T) {
		err := policy.ValidateViewerAccess(shared.RoleAdmin, &Monitoramento{Status: shared.StatusDraft}, "mon-1")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
	})

	t.Run("update bloqueado em pending", func(t *testing.T) {
		err := policy.ValidateUpdate(&Monitoramento{Status: shared.StatusPending}, shared.RoleAdmin, "admin-1")
		assertPolicyStatus(t, err, 409)
	})

	t.Run("update bloqueado em approved", func(t *testing.T) {
		err := policy.ValidateUpdate(&Monitoramento{Status: shared.StatusApproved}, shared.RoleAdmin, "admin-1")
		assertPolicyStatus(t, err, 409)
	})

	t.Run("tech só edita próprio draft", func(t *testing.T) {
		err := policy.ValidateUpdate(
			&Monitoramento{Status: shared.StatusDraft, CreatedBy: "other"},
			shared.RoleTech,
			"tech-1",
		)
		assertPolicyStatus(t, err, 403)
	})

	t.Run("admin edita qualquer monitoramento", func(t *testing.T) {
		err := policy.ValidateUpdate(
			&Monitoramento{Status: shared.StatusRejected, CreatedBy: "other"},
			shared.RoleAdmin,
			"admin-1",
		)
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
	})

	t.Run("soft delete exige draft", func(t *testing.T) {
		err := policy.ValidateSoftDelete(&Monitoramento{Status: shared.StatusPending}, shared.RoleAdmin, "admin-1")
		assertPolicyStatus(t, err, 422)
	})

	t.Run("tech só deleta próprio monitoramento", func(t *testing.T) {
		err := policy.ValidateSoftDelete(
			&Monitoramento{Status: shared.StatusDraft, CreatedBy: "other"},
			shared.RoleTech,
			"tech-1",
		)
		assertPolicyStatus(t, err, 403)
	})

	t.Run("submit aceita draft", func(t *testing.T) {
		err := policy.ValidateSubmit(&Monitoramento{Status: shared.StatusDraft, CreatedBy: "admin-1"}, shared.RoleAdmin, "admin-1")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
	})

	t.Run("submit aceita rejected (re-submissão após correção)", func(t *testing.T) {
		err := policy.ValidateSubmit(&Monitoramento{Status: shared.StatusRejected, CreatedBy: "admin-1"}, shared.RoleAdmin, "admin-1")
		if err != nil {
			t.Fatalf("erro inesperado para re-submissão: %v", err)
		}
	})

	t.Run("submit bloqueia approved", func(t *testing.T) {
		err := policy.ValidateSubmit(&Monitoramento{Status: shared.StatusApproved}, shared.RoleAdmin, "admin-1")
		assertPolicyStatus(t, err, 409)
	})

	t.Run("tech só submete próprio monitoramento", func(t *testing.T) {
		err := policy.ValidateSubmit(
			&Monitoramento{Status: shared.StatusDraft, CreatedBy: "other"},
			shared.RoleTech,
			"tech-1",
		)
		assertPolicyStatus(t, err, 403)
	})

	t.Run("approve exige pending", func(t *testing.T) {
		err := policy.ValidateApprove(&Monitoramento{Status: shared.StatusDraft})
		assertPolicyStatus(t, err, 409)
	})

	t.Run("approve aceita pending", func(t *testing.T) {
		err := policy.ValidateApprove(&Monitoramento{Status: shared.StatusPending})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
	})

	t.Run("reject exige pending", func(t *testing.T) {
		err := policy.ValidateReject(&Monitoramento{Status: shared.StatusApproved})
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

package shared

import (
	"context"
	"testing"
)

func TestContextHelpers_SetAndGet(t *testing.T) {
	ctx := context.Background()
	ctx = WithUserID(ctx, "user-123")
	ctx = WithOrgID(ctx, "org-456")
	ctx = WithRole(ctx, "admin")

	if GetUserID(ctx) != "user-123" {
		t.Errorf("esperado 'user-123', recebeu '%s'", GetUserID(ctx))
	}
	if GetOrgID(ctx) != "org-456" {
		t.Errorf("esperado 'org-456', recebeu '%s'", GetOrgID(ctx))
	}
	if GetRole(ctx) != "admin" {
		t.Errorf("esperado 'admin', recebeu '%s'", GetRole(ctx))
	}
}

func TestContextHelpers_RetornaVazioQuandoAusente(t *testing.T) {
	ctx := context.Background()

	if GetUserID(ctx) != "" {
		t.Errorf("esperado vazio, recebeu '%s'", GetUserID(ctx))
	}
	if GetOrgID(ctx) != "" {
		t.Errorf("esperado vazio, recebeu '%s'", GetOrgID(ctx))
	}
	if GetRole(ctx) != "" {
		t.Errorf("esperado vazio, recebeu '%s'", GetRole(ctx))
	}
}

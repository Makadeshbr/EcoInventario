package apperror

import (
	"testing"
)

func TestAppError_ImplementaInterfaceError(t *testing.T) {
	var err error = NewValidation("campo obrigatório")
	if err.Error() != "campo obrigatório" {
		t.Errorf("esperado 'campo obrigatório', recebeu '%s'", err.Error())
	}
}

func TestNewNotFound_CodigoEStatus(t *testing.T) {
	err := NewNotFound("asset", "abc-123")

	if err.Code != "NOT_FOUND" {
		t.Errorf("Code esperado 'NOT_FOUND', recebeu '%s'", err.Code)
	}
	if err.Status != 404 {
		t.Errorf("Status esperado 404, recebeu %d", err.Status)
	}
	if err.Message != "asset não encontrado" {
		t.Errorf("Message esperada 'asset não encontrado', recebeu '%s'", err.Message)
	}
}

func TestNewConflict_CodigoEStatus(t *testing.T) {
	err := NewConflict("email já existe")

	if err.Code != "CONFLICT" {
		t.Errorf("Code esperado 'CONFLICT', recebeu '%s'", err.Code)
	}
	if err.Status != 409 {
		t.Errorf("Status esperado 409, recebeu %d", err.Status)
	}
}

func TestNewForbidden_CodigoEStatus(t *testing.T) {
	err := NewForbidden("sem permissão")

	if err.Code != "FORBIDDEN" {
		t.Errorf("Code esperado 'FORBIDDEN', recebeu '%s'", err.Code)
	}
	if err.Status != 403 {
		t.Errorf("Status esperado 403, recebeu %d", err.Status)
	}
}

func TestNewInvalidStatusTransition_MensagemFormatada(t *testing.T) {
	err := NewInvalidStatusTransition("draft", "approved")

	if err.Code != "INVALID_STATUS_TRANSITION" {
		t.Errorf("Code esperado 'INVALID_STATUS_TRANSITION', recebeu '%s'", err.Code)
	}
	if err.Status != 409 {
		t.Errorf("Status esperado 409, recebeu %d", err.Status)
	}
	expected := "Transição de 'draft' para 'approved' não permitida"
	if err.Message != expected {
		t.Errorf("Message esperada '%s', recebeu '%s'", expected, err.Message)
	}
}

func TestNewValidation_CodigoEStatus(t *testing.T) {
	err := NewValidation("latitude fora do range")

	if err.Code != "VALIDATION_ERROR" {
		t.Errorf("Code esperado 'VALIDATION_ERROR', recebeu '%s'", err.Code)
	}
	if err.Status != 400 {
		t.Errorf("Status esperado 400, recebeu %d", err.Status)
	}
}

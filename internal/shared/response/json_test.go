package response

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/allan/ecoinventario/internal/shared/apperror"
)

func TestJSON_EscreveStatusEContentType(t *testing.T) {
	w := httptest.NewRecorder()

	JSON(w, http.StatusOK, map[string]string{"status": "ok"})

	if w.Code != http.StatusOK {
		t.Errorf("status esperado %d, recebeu %d", http.StatusOK, w.Code)
	}
	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("Content-Type esperado 'application/json', recebeu '%s'", ct)
	}
}

func TestJSON_PayloadNil_NaoEscreveBody(t *testing.T) {
	w := httptest.NewRecorder()

	JSON(w, http.StatusNoContent, nil)

	if w.Code != http.StatusNoContent {
		t.Errorf("status esperado %d, recebeu %d", http.StatusNoContent, w.Code)
	}
	if w.Body.Len() != 0 {
		t.Errorf("body deveria estar vazio, recebeu: %s", w.Body.String())
	}
}

func TestHandleError_AppError_RetornaStatusCorreto(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	r.Header.Set("X-Request-Id", "req-123")

	err := apperror.NewNotFound("asset", "abc")
	HandleError(w, r, err)

	if w.Code != 404 {
		t.Errorf("status esperado 404, recebeu %d", w.Code)
	}
	body := w.Body.String()
	if !contains(body, "NOT_FOUND") {
		t.Errorf("body deveria conter 'NOT_FOUND': %s", body)
	}
	if !contains(body, "req-123") {
		t.Errorf("body deveria conter request_id 'req-123': %s", body)
	}
}

func TestHandleError_ErroGenerico_Retorna500(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/test", nil)

	HandleError(w, r, errors.New("database connection failed"))

	if w.Code != 500 {
		t.Errorf("status esperado 500, recebeu %d", w.Code)
	}
	body := w.Body.String()
	if !contains(body, "INTERNAL_ERROR") {
		t.Errorf("body deveria conter 'INTERNAL_ERROR': %s", body)
	}
	// Segurança: não deve expor detalhes internos
	if contains(body, "database connection failed") {
		t.Error("body NÃO deveria expor detalhes internos do erro")
	}
}

func TestBadRequest_RetornaStatus400(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/test", nil)
	r.Header.Set("X-Request-Id", "req-456")

	BadRequest(w, r, "JSON inválido")

	if w.Code != 400 {
		t.Errorf("status esperado 400, recebeu %d", w.Code)
	}
	body := w.Body.String()
	if !contains(body, "BAD_REQUEST") {
		t.Errorf("body deveria conter 'BAD_REQUEST': %s", body)
	}
}

func TestValidationError_RetornaStatus400ComDetalhes(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/test", nil)

	ValidationError(w, r, errors.New("campo 'email' é obrigatório"))

	if w.Code != 400 {
		t.Errorf("status esperado 400, recebeu %d", w.Code)
	}
	body := w.Body.String()
	if !contains(body, "VALIDATION_ERROR") {
		t.Errorf("body deveria conter 'VALIDATION_ERROR': %s", body)
	}
}

// contains verifica se s contém substr (helper para testes).
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsStr(s, substr))
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

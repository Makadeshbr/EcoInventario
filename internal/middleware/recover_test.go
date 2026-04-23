package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRecover_PanicNaoDerrubaServidor(t *testing.T) {
	handler := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("algo terrível aconteceu")
	}))

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)

	// NÃO deve dar panic
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("status esperado 500, recebeu %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "INTERNAL_ERROR") {
		t.Errorf("body deveria conter 'INTERNAL_ERROR': %s", body)
	}
	// Segurança: mensagem do panic NÃO deve vazar para o client
	if strings.Contains(body, "algo terrível aconteceu") {
		t.Error("mensagem do panic NÃO deveria vazar para a response")
	}
}

func TestRecover_SemPanic_PassaNormalmente(t *testing.T) {
	handler := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status esperado 200, recebeu %d", w.Code)
	}
}

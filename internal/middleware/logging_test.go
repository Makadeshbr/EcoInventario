package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLogging_CapturaStatusCode(t *testing.T) {
	handler := Logging(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/assets", nil)

	// Não deve dar panic — apenas verifica que executa sem erro
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("status esperado %d, recebeu %d", http.StatusCreated, w.Code)
	}
}

func TestLogging_StatusDefaultE200(t *testing.T) {
	handler := Logging(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Não chama WriteHeader — deve assumir 200
		w.Write([]byte("ok"))
	}))

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status esperado %d, recebeu %d", http.StatusOK, w.Code)
	}
}

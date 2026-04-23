package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORS_OrigemPermitida_AdicionaHeaders(t *testing.T) {
	cors := CORS([]string{"http://localhost:3000"})
	handler := cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("Origin", "http://localhost:3000")
	handler.ServeHTTP(w, r)

	if w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Error("deveria permitir origin http://localhost:3000")
	}
}

func TestCORS_OrigemNaoPermitida_SemHeaders(t *testing.T) {
	cors := CORS([]string{"http://localhost:3000"})
	handler := cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("Origin", "http://malicious.com")
	handler.ServeHTTP(w, r)

	if w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Error("NÃO deveria permitir origin desconhecida")
	}
}

func TestCORS_Preflight_Retorna204(t *testing.T) {
	cors := CORS([]string{"http://localhost:3000"})
	handler := cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler não deveria ser chamado no preflight")
	}))

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodOptions, "/", nil)
	r.Header.Set("Origin", "http://localhost:3000")
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("preflight deveria retornar 204, recebeu %d", w.Code)
	}
}

func TestParseOrigins_MultiplaOrigens(t *testing.T) {
	result := ParseOrigins("http://localhost:3000, http://localhost:8080")
	if len(result) != 2 {
		t.Errorf("esperado 2 origens, recebeu %d", len(result))
	}
}

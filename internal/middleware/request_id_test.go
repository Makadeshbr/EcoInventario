package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequestID_AdicionaHeaderNaResponse(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(w, r)

	reqID := w.Header().Get("X-Request-Id")
	if reqID == "" {
		t.Error("X-Request-Id deveria estar presente no header da response")
	}
	if len(reqID) < 36 {
		t.Errorf("X-Request-Id deveria ser UUID, recebeu '%s'", reqID)
	}
}

func TestRequestID_DisponibilizaNoContext(t *testing.T) {
	var ctxID string
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctxID = GetRequestID(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(w, r)

	if ctxID == "" {
		t.Error("Request ID deveria estar acessível via GetRequestID(ctx)")
	}
	if ctxID != w.Header().Get("X-Request-Id") {
		t.Error("Request ID no context deve ser igual ao do header")
	}
}

func TestRequestID_GeraIDsUnicos(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	w1 := httptest.NewRecorder()
	r1 := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(w1, r1)

	w2 := httptest.NewRecorder()
	r2 := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(w2, r2)

	id1 := w1.Header().Get("X-Request-Id")
	id2 := w2.Header().Get("X-Request-Id")
	if id1 == id2 {
		t.Error("Cada request deve ter um ID único")
	}
}

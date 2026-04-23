package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSecurityHeaders_TodosPresentes(t *testing.T) {
	handler := SecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(w, r)

	tests := []struct {
		header   string
		expected string
	}{
		{"X-Content-Type-Options", "nosniff"},
		{"X-Frame-Options", "DENY"},
		{"Strict-Transport-Security", "max-age=63072000; includeSubDomains"},
		{"Content-Security-Policy", "default-src 'none'"},
	}

	for _, tt := range tests {
		got := w.Header().Get(tt.header)
		if got != tt.expected {
			t.Errorf("%s: esperado '%s', recebeu '%s'", tt.header, tt.expected, got)
		}
	}
}

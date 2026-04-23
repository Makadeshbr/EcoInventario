package middleware

import (
	"net/http"
	"strings"
)

// CORS retorna um middleware que configura os headers CORS com base nas origens permitidas.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	originsSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originsSet[o] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			if originsSet[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id, X-Idempotency-Key")
				w.Header().Set("Access-Control-Expose-Headers", "X-Request-Id")
				w.Header().Set("Access-Control-Max-Age", "86400")
				w.Header().Set("Vary", "Origin")
			}

			// Preflight
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// ParseOrigins divide uma string separada por vírgulas em slice de origens.
func ParseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

package middleware

import "net/http"

// SecurityHeaders adiciona headers de segurança em todas as responses:
// X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Content-Security-Policy.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		w.Header().Set("Content-Security-Policy", "default-src 'none'")

		next.ServeHTTP(w, r)
	})
}

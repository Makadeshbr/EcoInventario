package middleware

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"runtime/debug"
)

// Recover captura panics e retorna 500 com mensagem genérica + log do stack.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic recovered",
					"error", rec,
					"stack", string(debug.Stack()),
					"request_id", GetRequestID(r.Context()),
					"method", r.Method,
					"path", r.URL.Path,
				)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]any{
					"error": map[string]any{
						"code":       "INTERNAL_ERROR",
						"message":    "Erro interno",
						"request_id": GetRequestID(r.Context()),
					},
				})
			}
		}()

		next.ServeHTTP(w, r)
	})
}

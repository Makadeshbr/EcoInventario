package middleware

import (
	"net/http"

	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/shared/response"
)

// RequireRole bloqueia requests cujo role não esteja na lista permitida.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := shared.GetRole(r.Context())
			if _, ok := allowed[role]; !ok {
				response.HandleError(w, r, apperror.NewForbidden("Acesso negado"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

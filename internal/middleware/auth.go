package middleware

import (
	"net/http"
	"strings"

	"github.com/allan/ecoinventario/internal/auth"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/shared/response"
)

// Auth extrai e valida o Bearer JWT, populando userID/orgID/role no context.
func Auth(jwtSvc *auth.JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				response.HandleError(w, r, apperror.NewUnauthorized("Token ausente ou inválido"))
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := jwtSvc.ValidateAccessToken(tokenStr)
			if err != nil {
				response.HandleError(w, r, apperror.NewUnauthorized("Token ausente ou inválido"))
				return
			}

			ctx := shared.WithUserID(r.Context(), claims.Sub)
			ctx = shared.WithOrgID(ctx, claims.Org)
			ctx = shared.WithRole(ctx, claims.Role)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

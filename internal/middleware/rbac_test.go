package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/allan/ecoinventario/internal/middleware"
	"github.com/allan/ecoinventario/internal/shared"
)

func TestRequireRole(t *testing.T) {
	okHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	t.Run("role permitida passa", func(t *testing.T) {
		handler := middleware.RequireRole(shared.RoleAdmin, shared.RoleTech)(okHandler)

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req = req.WithContext(shared.WithRole(req.Context(), shared.RoleTech))
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("status: got %d, want 200", rr.Code)
		}
	})

	t.Run("role não permitida retorna 403", func(t *testing.T) {
		handler := middleware.RequireRole(shared.RoleAdmin)(okHandler)

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req = req.WithContext(shared.WithRole(req.Context(), shared.RoleTech))
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Errorf("status: got %d, want 403", rr.Code)
		}
	})

	t.Run("sem role no context retorna 403", func(t *testing.T) {
		handler := middleware.RequireRole(shared.RoleAdmin)(okHandler)

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Errorf("status: got %d, want 403", rr.Code)
		}
	})

	t.Run("admin tem acesso a rota de admin", func(t *testing.T) {
		handler := middleware.RequireRole(shared.RoleAdmin)(okHandler)

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req = req.WithContext(shared.WithRole(req.Context(), shared.RoleAdmin))
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("status: got %d, want 200", rr.Code)
		}
	})
}

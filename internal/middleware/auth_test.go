package middleware_test

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/allan/ecoinventario/internal/auth"
	"github.com/allan/ecoinventario/internal/middleware"
	"github.com/allan/ecoinventario/internal/shared"
)

func newTestJWT(t *testing.T) *auth.JWTService {
	t.Helper()
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	svc, err := auth.NewJWTService(
		base64.StdEncoding.EncodeToString(priv),
		base64.StdEncoding.EncodeToString(pub),
		15*time.Minute,
	)
	if err != nil {
		t.Fatalf("NewJWTService: %v", err)
	}
	return svc
}

func TestAuthMiddleware(t *testing.T) {
	jwtSvc := newTestJWT(t)

	handler := middleware.Auth(jwtSvc)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := shared.GetUserID(r.Context())
		orgID := shared.GetOrgID(r.Context())
		role := shared.GetRole(r.Context())
		w.Header().Set("X-UserID", userID)
		w.Header().Set("X-OrgID", orgID)
		w.Header().Set("X-Role", role)
		w.WriteHeader(http.StatusOK)
	}))

	t.Run("token válido popula context e passa", func(t *testing.T) {
		token, _ := jwtSvc.GenerateAccessToken("user-123", "org-456", "tech")

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("status: got %d, want 200", rr.Code)
		}
		if rr.Header().Get("X-UserID") != "user-123" {
			t.Errorf("userID: got %q", rr.Header().Get("X-UserID"))
		}
		if rr.Header().Get("X-OrgID") != "org-456" {
			t.Errorf("orgID: got %q", rr.Header().Get("X-OrgID"))
		}
		if rr.Header().Get("X-Role") != "tech" {
			t.Errorf("role: got %q", rr.Header().Get("X-Role"))
		}
	})

	t.Run("sem Authorization header retorna 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("status: got %d, want 401", rr.Code)
		}
	})

	t.Run("token inválido retorna 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer token.invalido.aqui")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("status: got %d, want 401", rr.Code)
		}
	})

	t.Run("Bearer ausente no header retorna 401", func(t *testing.T) {
		token, _ := jwtSvc.GenerateAccessToken("user-123", "org-456", "tech")
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", token) // sem "Bearer "
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("status: got %d, want 401", rr.Code)
		}
	})
}

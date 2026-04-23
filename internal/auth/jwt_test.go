package auth_test

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"testing"
	"time"

	"github.com/allan/ecoinventario/internal/auth"
)

func generateTestKeys(t *testing.T) (privB64, pubB64 string) {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("falha ao gerar chaves: %v", err)
	}
	return base64.StdEncoding.EncodeToString(priv), base64.StdEncoding.EncodeToString(pub)
}

func TestGenerateAccessToken(t *testing.T) {
	privB64, pubB64 := generateTestKeys(t)

	t.Run("gera token válido com claims corretos", func(t *testing.T) {
		svc, err := auth.NewJWTService(privB64, pubB64, 15*time.Minute)
		if err != nil {
			t.Fatalf("erro ao criar JWTService: %v", err)
		}

		token, err := svc.GenerateAccessToken("user-123", "org-456", "tech")
		if err != nil {
			t.Fatalf("erro ao gerar token: %v", err)
		}
		if token == "" {
			t.Error("token vazio")
		}

		claims, err := svc.ValidateAccessToken(token)
		if err != nil {
			t.Fatalf("token inválido: %v", err)
		}

		if claims.Sub != "user-123" {
			t.Errorf("Sub: got %q, want %q", claims.Sub, "user-123")
		}
		if claims.Org != "org-456" {
			t.Errorf("Org: got %q, want %q", claims.Org, "org-456")
		}
		if claims.Role != "tech" {
			t.Errorf("Role: got %q, want %q", claims.Role, "tech")
		}
		if claims.Jti == "" {
			t.Error("Jti não pode ser vazio")
		}
	})

	t.Run("token expirado é rejeitado", func(t *testing.T) {
		svc, _ := auth.NewJWTService(privB64, pubB64, -1*time.Second)
		token, _ := svc.GenerateAccessToken("user-123", "org-456", "tech")
		_, err := svc.ValidateAccessToken(token)
		if err == nil {
			t.Error("esperava erro para token expirado")
		}
	})

	t.Run("token assinado com outra chave é rejeitado", func(t *testing.T) {
		_, otherPriv, _ := ed25519.GenerateKey(rand.Reader)
		otherPrivB64 := base64.StdEncoding.EncodeToString(otherPriv)

		svcA, _ := auth.NewJWTService(privB64, pubB64, 15*time.Minute)
		svcB, _ := auth.NewJWTService(otherPrivB64, pubB64, 15*time.Minute)

		token, _ := svcB.GenerateAccessToken("user-123", "org-456", "tech")
		_, err := svcA.ValidateAccessToken(token)
		if err == nil {
			t.Error("esperava erro para token assinado com outra chave")
		}
	})

	t.Run("token adulterado é rejeitado", func(t *testing.T) {
		svc, _ := auth.NewJWTService(privB64, pubB64, 15*time.Minute)
		token, _ := svc.GenerateAccessToken("user-123", "org-456", "tech")
		_, err := svc.ValidateAccessToken(token + "adulterado")
		if err == nil {
			t.Error("esperava erro para token adulterado")
		}
	})

	t.Run("chave privada inválida retorna erro", func(t *testing.T) {
		_, err := auth.NewJWTService("chave-invalida", pubB64, 15*time.Minute)
		if err == nil {
			t.Error("esperava erro para chave privada inválida")
		}
	})
}

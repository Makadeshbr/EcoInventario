package auth_test

import (
	"strings"
	"testing"

	"github.com/allan/ecoinventario/internal/auth"
)

func TestHashPassword(t *testing.T) {
	pepper := "test-pepper"

	t.Run("gera hash que começa com $argon2id$", func(t *testing.T) {
		hash, err := auth.HashPassword("senha123", pepper)
		if err != nil {
			t.Fatalf("esperava nil, got %v", err)
		}
		if !strings.HasPrefix(hash, "$argon2id$") {
			t.Errorf("hash inválido: %s", hash)
		}
	})

	t.Run("dois hashes da mesma senha são diferentes (salt aleatório)", func(t *testing.T) {
		h1, _ := auth.HashPassword("senha123", pepper)
		h2, _ := auth.HashPassword("senha123", pepper)
		if h1 == h2 {
			t.Error("hashes iguais — salt não foi aleatorizado")
		}
	})

	t.Run("rejeita senha vazia", func(t *testing.T) {
		_, err := auth.HashPassword("", pepper)
		if err == nil {
			t.Error("esperava erro para senha vazia")
		}
	})
}

func TestVerifyPassword(t *testing.T) {
	pepper := "test-pepper"

	t.Run("senha correta retorna true", func(t *testing.T) {
		hash, _ := auth.HashPassword("senha123", pepper)
		ok, err := auth.VerifyPassword("senha123", hash, pepper)
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if !ok {
			t.Error("esperava true")
		}
	})

	t.Run("senha errada retorna false", func(t *testing.T) {
		hash, _ := auth.HashPassword("senha123", pepper)
		ok, err := auth.VerifyPassword("outrasenha", hash, pepper)
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if ok {
			t.Error("esperava false")
		}
	})

	t.Run("pepper errado retorna false", func(t *testing.T) {
		hash, _ := auth.HashPassword("senha123", pepper)
		ok, err := auth.VerifyPassword("senha123", hash, "outro-pepper")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if ok {
			t.Error("esperava false com pepper errado")
		}
	})

	t.Run("hash inválido retorna erro", func(t *testing.T) {
		_, err := auth.VerifyPassword("senha123", "nao-e-argon2", pepper)
		if err == nil {
			t.Error("esperava erro para hash inválido")
		}
	})
}

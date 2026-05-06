package vo

import (
	"strings"
	"testing"
)

func TestNewQRCode(t *testing.T) {
	t.Run("válido", func(t *testing.T) {
		q, err := NewQRCode("ABC-123")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if q.String() != "ABC-123" {
			t.Fatalf("got %q, want %q", q.String(), "ABC-123")
		}
	})

	t.Run("trim de espaços", func(t *testing.T) {
		q, err := NewQRCode("  ABC  ")
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if q.String() != "ABC" {
			t.Fatalf("got %q, want %q", q.String(), "ABC")
		}
	})

	t.Run("vazio retorna erro", func(t *testing.T) {
		if _, err := NewQRCode(""); err == nil {
			t.Fatal("esperava erro")
		}
	})

	t.Run("só espaços retorna erro", func(t *testing.T) {
		if _, err := NewQRCode("   "); err == nil {
			t.Fatal("esperava erro")
		}
	})

	t.Run("501 chars retorna erro", func(t *testing.T) {
		if _, err := NewQRCode(strings.Repeat("x", 501)); err == nil {
			t.Fatal("esperava erro")
		}
	})

	t.Run("500 chars é válido", func(t *testing.T) {
		s := strings.Repeat("x", 500)
		q, err := NewQRCode(s)
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if len(q.String()) != 500 {
			t.Fatalf("got len=%d, want 500", len(q.String()))
		}
	})
}

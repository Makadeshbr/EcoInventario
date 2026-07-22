package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/allan/ecoinventario/internal/middleware"
)

// Com 1 proxy confiável (Render), o IP real é o ÚLTIMO da cadeia X-Forwarded-For —
// o valor que o proxy anexa. Valores injetados pelo cliente ficam à esquerda e
// não podem burlar o rate limit.
func TestClientIP_SingleProxy_UsaUltimoDaCadeia(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/login", nil)
	r.Header.Set("X-Forwarded-For", "9.9.9.9, 203.0.113.7") // 9.9.9.9 = spoof do cliente
	r.RemoteAddr = "10.0.0.1:5000"                          // IP interno do proxy

	if got := middleware.ClientIP(r, 1); got != "203.0.113.7" {
		t.Errorf("com 1 proxy confiável esperava o IP real (203.0.113.7), got %q", got)
	}
}

func TestClientIP_SpoofNaoAlteraChave(t *testing.T) {
	// Duas requisições do mesmo cliente real (203.0.113.7) com spoofs diferentes
	// devem produzir a MESMA chave — senão o brute force burla o limite.
	r1 := httptest.NewRequest(http.MethodPost, "/login", nil)
	r1.Header.Set("X-Forwarded-For", "1.1.1.1, 203.0.113.7")
	r2 := httptest.NewRequest(http.MethodPost, "/login", nil)
	r2.Header.Set("X-Forwarded-For", "2.2.2.2, 203.0.113.7")

	if middleware.ClientIP(r1, 1) != middleware.ClientIP(r2, 1) {
		t.Error("spoof no X-Forwarded-For não deveria alterar a chave de rate limit")
	}
}

func TestClientIP_DoisProxies_UsaPenultimo(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/login", nil)
	// spoof, cliente_real, ip_do_cloudflare — com 2 hops confiáveis o real é o 2º da direita
	r.Header.Set("X-Forwarded-For", "9.9.9.9, 203.0.113.7, 172.16.0.4")

	if got := middleware.ClientIP(r, 2); got != "203.0.113.7" {
		t.Errorf("com 2 proxies confiáveis esperava 203.0.113.7, got %q", got)
	}
}

func TestClientIP_SemXFF_UsaRemoteAddr(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/login", nil)
	r.RemoteAddr = "198.51.100.23:44321"

	if got := middleware.ClientIP(r, 1); got != "198.51.100.23" {
		t.Errorf("sem X-Forwarded-For esperava o host do RemoteAddr, got %q", got)
	}
}

func TestKeyByIP_RetornaClosureQueUsaCadeia(t *testing.T) {
	keyFn := middleware.KeyByIP(1)
	r := httptest.NewRequest(http.MethodPost, "/login", nil)
	r.Header.Set("X-Forwarded-For", "9.9.9.9, 203.0.113.7")

	if got := keyFn(r); got != "203.0.113.7" {
		t.Errorf("KeyByIP(1) deveria usar o último da cadeia, got %q", got)
	}
}

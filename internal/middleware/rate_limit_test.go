package middleware_test

import (
	"testing"
	"time"

	"github.com/allan/ecoinventario/internal/middleware"
)

func TestRateLimiter_AllowsUnderLimit(t *testing.T) {
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	rl := middleware.NewRateLimiterWithClock(3, time.Minute, func() time.Time { return now })

	for i := 0; i < 3; i++ {
		allowed, _ := rl.Allow("key")
		if !allowed {
			t.Fatalf("request %d deveria ser permitida", i+1)
		}
	}
}

func TestRateLimiter_BlocksAtLimit(t *testing.T) {
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	rl := middleware.NewRateLimiterWithClock(3, time.Minute, func() time.Time { return now })

	for i := 0; i < 3; i++ {
		rl.Allow("key")
	}

	allowed, retryAfter := rl.Allow("key")
	if allowed {
		t.Error("4ª request deveria ser bloqueada")
	}
	if retryAfter <= 0 {
		t.Errorf("retry_after deveria ser positivo, got %v", retryAfter)
	}
}

func TestRateLimiter_SlidingWindowExpiry(t *testing.T) {
	current := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	rl := middleware.NewRateLimiterWithClock(2, 100*time.Millisecond, func() time.Time { return current })

	rl.Allow("key")
	rl.Allow("key")

	// Deve estar bloqueado
	if allowed, _ := rl.Allow("key"); allowed {
		t.Error("deveria estar bloqueado")
	}

	// Avança o clock para além da janela
	current = current.Add(101 * time.Millisecond)

	// Deve liberar
	if allowed, _ := rl.Allow("key"); !allowed {
		t.Error("deveria ser permitido após a janela expirar")
	}
}

func TestRateLimiter_IsolatesKeys(t *testing.T) {
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	rl := middleware.NewRateLimiterWithClock(2, time.Minute, func() time.Time { return now })

	rl.Allow("ip-1")
	rl.Allow("ip-1")

	// ip-1 está no limite — ip-2 deve estar livre
	if allowed, _ := rl.Allow("ip-2"); !allowed {
		t.Error("ip-2 deveria ser permitido (bucket separado)")
	}
}

func TestRateLimiter_RetryAfterReflectsOldestTimestamp(t *testing.T) {
	start := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	tick := start
	rl := middleware.NewRateLimiterWithClock(2, time.Minute, func() time.Time { return tick })

	rl.Allow("key") // t=0s
	tick = start.Add(10 * time.Second)
	rl.Allow("key") // t=10s

	tick = start.Add(20 * time.Second)
	allowed, retryAfter := rl.Allow("key") // t=20s
	if allowed {
		t.Fatal("deveria estar bloqueado")
	}
	// Oldest timestamp é t=0. Window = 60s. Expires at t=60s. Current = t=20s.
	// RetryAfter ≈ 40s
	if retryAfter < 39*time.Second || retryAfter > 41*time.Second {
		t.Errorf("retry_after esperado ~40s, got %v", retryAfter)
	}
}

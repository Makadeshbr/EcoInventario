package middleware

import (
	"net"
	"net/http"
	"strconv"
	"strings"
	gosync "sync"
	"time"

	"github.com/allan/ecoinventario/internal/shared"
)

// RateLimiter implementa sliding window in-memory por chave.
type RateLimiter struct {
	mu      gosync.Mutex
	buckets map[string][]time.Time
	limit   int
	window  time.Duration
	now     func() time.Time
}

// NewRateLimiter cria um rate limiter com clock real.
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return NewRateLimiterWithClock(limit, window, time.Now)
}

// NewRateLimiterWithClock cria um rate limiter com clock injetável (para testes).
func NewRateLimiterWithClock(limit int, window time.Duration, now func() time.Time) *RateLimiter {
	return &RateLimiter{
		buckets: make(map[string][]time.Time),
		limit:   limit,
		window:  window,
		now:     now,
	}
}

// Allow verifica se a chave pode fazer mais uma requisição.
// Retorna (true, 0) se permitido, ou (false, retryAfter) se bloqueado.
func (r *RateLimiter) Allow(key string) (bool, time.Duration) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := r.now()
	cutoff := now.Add(-r.window)

	// Remove timestamps fora da janela (sliding window).
	times := r.buckets[key]
	n := 0
	for _, t := range times {
		if t.After(cutoff) {
			times[n] = t
			n++
		}
	}
	times = times[:n]

	if len(times) >= r.limit {
		// Retry-After = quando o timestamp mais antigo vai expirar.
		retryAfter := times[0].Add(r.window).Sub(now)
		r.buckets[key] = times
		return false, retryAfter
	}

	r.buckets[key] = append(times, now)
	return true, 0
}

// RateLimit cria middleware de rate limiting com a chave extraída por keyFn.
func RateLimit(limiter *RateLimiter, keyFn func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := keyFn(r)
			allowed, retryAfter := limiter.Allow(key)
			if !allowed {
				seconds := int(retryAfter.Seconds()) + 1
				w.Header().Set("Retry-After", strconv.Itoa(seconds))
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Muitas requisições. Tente novamente em breve."}}`))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// KeyByIP extrai o IP do cliente como chave para rate limiting.
func KeyByIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if idx := strings.IndexByte(xff, ','); idx >= 0 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}
	if xri := r.Header.Get("X-Real-Ip"); xri != "" {
		return strings.TrimSpace(xri)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// KeyByUser extrai o userID autenticado como chave para rate limiting.
func KeyByUser(r *http.Request) string {
	return shared.GetUserID(r.Context())
}

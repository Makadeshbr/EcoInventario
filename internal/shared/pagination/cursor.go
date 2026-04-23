package pagination

import (
	"net/http"
	"strconv"
)

const (
	// DefaultLimit é o número padrão de registros por página.
	DefaultLimit = 20
	// MaxLimit é o número máximo de registros por página.
	MaxLimit = 100
)

// CursorParams contém os parâmetros de paginação por cursor.
type CursorParams struct {
	Cursor string
	Limit  int
}

// ParseCursorParams extrai cursor e limit dos query params da requisição.
// Se limit não for informado ou for inválido, usa DefaultLimit.
// Se limit exceder MaxLimit, usa MaxLimit.
func ParseCursorParams(r *http.Request) CursorParams {
	cursor := r.URL.Query().Get("cursor")

	limit := DefaultLimit
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	if limit > MaxLimit {
		limit = MaxLimit
	}

	return CursorParams{
		Cursor: cursor,
		Limit:  limit,
	}
}

package response

// Pagination contém metadados de cursor-based pagination.
type Pagination struct {
	NextCursor *string `json:"next_cursor"`
	HasMore    bool    `json:"has_more"`
}

// Paginated é a resposta padrão para listagens com paginação.
type Paginated[T any] struct {
	Data       []T        `json:"data"`
	Pagination Pagination `json:"pagination"`
}

// NewPaginated constrói um Paginated a partir de um slice com (limit+1) itens.
// Se len(items) > limit, HasMore = true e o último item é removido.
// nextCursorFn extrai o cursor do último item real.
func NewPaginated[T any](items []T, limit int, nextCursorFn func(T) string) Paginated[T] {
	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}

	var nextCursor *string
	if hasMore && len(items) > 0 {
		c := nextCursorFn(items[len(items)-1])
		nextCursor = &c
	}

	return Paginated[T]{
		Data: items,
		Pagination: Pagination{
			NextCursor: nextCursor,
			HasMore:    hasMore,
		},
	}
}

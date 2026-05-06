package audit

import (
	"net/http"

	"github.com/allan/ecoinventario/internal/shared/pagination"
	"github.com/allan/ecoinventario/internal/shared/response"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseCursorParams(r)

	result, err := h.svc.List(r.Context(), ListFilters{
		EntityType:  r.URL.Query().Get("entity_type"),
		EntityID:    r.URL.Query().Get("entity_id"),
		PerformedBy: r.URL.Query().Get("performed_by"),
		Action:      r.URL.Query().Get("action"),
		From:        r.URL.Query().Get("from"),
		To:          r.URL.Query().Get("to"),
		Cursor:      p.Cursor,
		Limit:       p.Limit,
	})
	if err != nil {
		response.HandleError(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, result)
}

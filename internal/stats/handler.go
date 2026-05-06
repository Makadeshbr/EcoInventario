package stats

import (
	"net/http"

	"github.com/allan/ecoinventario/internal/shared/response"
)

type Handler struct {
	svc dashboardReader
}

func NewHandler(svc dashboardReader) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) HandleDashboard(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.Dashboard(r.Context())
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

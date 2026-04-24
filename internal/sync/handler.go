package sync

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/allan/ecoinventario/internal/shared/response"
)

// Handler expõe os endpoints HTTP de sync.
type Handler struct {
	svc *Service
}

// NewHandler cria o handler de sync.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandlePush processa POST /api/v1/sync/push.
func (h *Handler) HandlePush(w http.ResponseWriter, r *http.Request) {
	var req PushRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, r, "JSON inválido")
		return
	}

	resp, err := h.svc.ProcessPush(r.Context(), req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, resp)
}

// HandlePull processa GET /api/v1/sync/pull.
func (h *Handler) HandlePull(w http.ResponseWriter, r *http.Request) {
	sinceRaw := r.URL.Query().Get("since")
	if sinceRaw == "" {
		response.BadRequest(w, r, "parâmetro 'since' é obrigatório")
		return
	}

	since, err := time.Parse(time.RFC3339, sinceRaw)
	if err != nil {
		response.BadRequest(w, r, "formato de 'since' inválido; use ISO 8601")
		return
	}

	var entityTypes []string
	if raw := r.URL.Query().Get("entity_types"); raw != "" {
		for _, t := range strings.Split(raw, ",") {
			if t = strings.TrimSpace(t); t != "" {
				entityTypes = append(entityTypes, t)
			}
		}
	}

	limit := 100
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if v, parseErr := strconv.Atoi(raw); parseErr == nil && v > 0 {
			limit = v
		}
	}

	cursor := r.URL.Query().Get("cursor")

	resp, err := h.svc.ProcessPull(r.Context(), PullParams{
		Since:       since,
		EntityTypes: entityTypes,
		Limit:       limit,
		Cursor:      cursor,
	})
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, resp)
}

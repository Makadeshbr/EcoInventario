package assettype

import (
	"encoding/json"
	"net/http"

	"github.com/allan/ecoinventario/internal/shared/response"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// Handler expõe os endpoints HTTP de tipos de ativo.
type Handler struct {
	svc *Service
}

// NewHandler cria o handler de asset types.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleList processa GET /api/v1/asset-types.
func (h *Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	types, err := h.svc.List(r.Context())
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"data": types})
}

// HandleCreate processa POST /api/v1/asset-types.
func (h *Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, r, "JSON inválido")
		return
	}
	if err := validate.Struct(req); err != nil {
		response.ValidationError(w, r, err)
		return
	}

	at, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, at)
}

// HandleUpdate processa PATCH /api/v1/asset-types/{id}.
func (h *Handler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req UpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, r, "JSON inválido")
		return
	}
	if err := validate.Struct(req); err != nil {
		response.ValidationError(w, r, err)
		return
	}

	at, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, at)
}

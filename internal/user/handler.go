package user

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/allan/ecoinventario/internal/shared/pagination"
	"github.com/allan/ecoinventario/internal/shared/response"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// Handler expõe os endpoints HTTP de usuários.
type Handler struct {
	svc *Service
}

// NewHandler cria o handler de usuários.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleList processa GET /api/v1/users.
func (h *Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseCursorParams(r)

	f := ListFilters{
		Cursor: p.Cursor,
		Limit:  p.Limit,
		Role:   r.URL.Query().Get("role"),
	}

	if raw := r.URL.Query().Get("is_active"); raw != "" {
		v, err := strconv.ParseBool(raw)
		if err == nil {
			f.IsActive = &v
		}
	}

	result, err := h.svc.List(r.Context(), f)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, result)
}

// HandleGet processa GET /api/v1/users/{id}.
func (h *Handler) HandleGet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	u, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, u)
}

// HandleCreate processa POST /api/v1/users.
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

	u, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, u)
}

// HandleUpdate processa PATCH /api/v1/users/{id}.
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

	u, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, u)
}

// HandleDelete processa DELETE /api/v1/users/{id}.
func (h *Handler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.svc.SoftDelete(r.Context(), id); err != nil {
		response.HandleError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

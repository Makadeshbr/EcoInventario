package media

import (
	"encoding/json"
	"net/http"

	"github.com/allan/ecoinventario/internal/shared/response"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// Handler expõe os endpoints HTTP de media.
type Handler struct {
	svc *Service
}

// NewHandler cria o handler de media.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleUploadURL processa POST /api/v1/media/upload-url.
func (h *Handler) HandleUploadURL(w http.ResponseWriter, r *http.Request) {
	var req UploadURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, r, "JSON inválido")
		return
	}
	if err := validate.Struct(req); err != nil {
		response.ValidationError(w, r, err)
		return
	}

	resp, err := h.svc.GenerateUploadURL(r.Context(), req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusCreated, resp)
}

// HandleConfirm processa POST /api/v1/media/{id}/confirm.
func (h *Handler) HandleConfirm(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	resp, err := h.svc.Confirm(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, resp)
}

// HandleGet processa GET /api/v1/media/{id}.
func (h *Handler) HandleGet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	resp, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, resp)
}

// HandleDelete processa DELETE /api/v1/media/{id}. Soft delete.
func (h *Handler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.SoftDelete(r.Context(), id); err != nil {
		response.HandleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

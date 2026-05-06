package manejo

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/allan/ecoinventario/internal/shared/pagination"
	"github.com/allan/ecoinventario/internal/shared/response"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// Handler expõe os endpoints HTTP de manejos.
type Handler struct {
	svc *Service
}

// NewHandler cria o handler de manejos.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleList processa GET /api/v1/assets/{asset_id}/manejos.
func (h *Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	assetID := chi.URLParam(r, "asset_id")
	p := pagination.ParseCursorParams(r)
	q := r.URL.Query()
	createdFrom, createdTo, err := parseDateFilters(q.Get("date"), q.Get("from"), q.Get("to"))
	if err != nil {
		response.BadRequest(w, r, "Filtro de data invalido")
		return
	}

	result, err := h.svc.List(r.Context(), ListFilters{
		AssetID:     firstNonEmpty(assetID, q.Get("asset_id")),
		Status:      q.Get("status"),
		CreatedBy:   q.Get("created_by"),
		CreatedFrom: createdFrom,
		CreatedTo:   createdTo,
		Cursor:      p.Cursor,
		Limit:       p.Limit,
	})
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

func parseDateFilters(dateValue, fromValue, toValue string) (string, string, error) {
	if dateValue != "" {
		if _, err := time.Parse("2006-01-02", dateValue); err != nil {
			return "", "", err
		}
		return dateValue, dateValue, nil
	}
	if fromValue != "" {
		if _, err := time.Parse("2006-01-02", fromValue); err != nil {
			return "", "", err
		}
	}
	if toValue != "" {
		if _, err := time.Parse("2006-01-02", toValue); err != nil {
			return "", "", err
		}
	}
	return fromValue, toValue, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

// HandleGet processa GET /api/v1/manejos/{id}.
func (h *Handler) HandleGet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	m, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, m)
}

// HandleCreate processa POST /api/v1/manejos.
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

	m, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusCreated, m)
}

// HandleUpdate processa PATCH /api/v1/manejos/{id}.
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

	m, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, m)
}

// HandleDelete processa DELETE /api/v1/manejos/{id}. Soft delete.
func (h *Handler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.SoftDelete(r.Context(), id); err != nil {
		response.HandleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleSubmit processa POST /api/v1/manejos/{id}/submit.
func (h *Handler) HandleSubmit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	resp, err := h.svc.Submit(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, resp)
}

// HandleApprove processa POST /api/v1/manejos/{id}/approve.
func (h *Handler) HandleApprove(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	resp, err := h.svc.Approve(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, resp)
}

// HandleReject processa POST /api/v1/manejos/{id}/reject.
func (h *Handler) HandleReject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req RejectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, r, "JSON inválido")
		return
	}
	if err := validate.Struct(req); err != nil {
		response.ValidationError(w, r, err)
		return
	}

	resp, err := h.svc.Reject(r.Context(), id, req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, resp)
}

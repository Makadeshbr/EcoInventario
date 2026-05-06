package asset

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

// Handler expõe os endpoints HTTP de assets.
type Handler struct {
	svc *Service
}

// NewHandler cria o handler de assets.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleList processa GET /api/v1/assets.
func (h *Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseCursorParams(r)

	f := ListFilters{
		Cursor:    p.Cursor,
		Limit:     p.Limit,
		Status:    r.URL.Query().Get("status"),
		TypeID:    r.URL.Query().Get("type_id"),
		CreatedBy: r.URL.Query().Get("created_by"),
		QRCode:    r.URL.Query().Get("qr_code"),
	}

	result, err := h.svc.List(r.Context(), f)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

// HandleGet processa GET /api/v1/assets/{id}.
func (h *Handler) HandleGet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	a, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, a)
}

// HandleCreate processa POST /api/v1/assets.
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

	a, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusCreated, a)
}

// HandleUpdate processa PATCH /api/v1/assets/{id}.
// Retorna 200 para edição in-place, 201 quando uma nova versão é criada.
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

	a, created, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	response.JSON(w, status, a)
}

// HandleDelete processa DELETE /api/v1/assets/{id}. Soft delete.
func (h *Handler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.SoftDelete(r.Context(), id); err != nil {
		response.HandleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleSubmit processa POST /api/v1/assets/{id}/submit.
func (h *Handler) HandleSubmit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	resp, err := h.svc.Submit(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, resp)
}

// HandleApprove processa POST /api/v1/assets/{id}/approve.
func (h *Handler) HandleApprove(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	resp, err := h.svc.Approve(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, resp)
}

// HandleReject processa POST /api/v1/assets/{id}/reject.
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

// HandleHistory processa GET /api/v1/assets/{id}/history.
func (h *Handler) HandleHistory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	entries, err := h.svc.History(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"data": entries})
}

// HandleNearby processa GET /api/v1/assets/nearby.
func (h *Handler) HandleNearby(w http.ResponseWriter, r *http.Request) {
	lat, err := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	if err != nil {
		response.BadRequest(w, r, "lat inválido")
		return
	}
	lng, err := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
	if err != nil {
		response.BadRequest(w, r, "lng inválido")
		return
	}
	if lat < -90 || lat > 90 || lng < -180 || lng > 180 {
		response.BadRequest(w, r, "coordenadas fora dos limites")
		return
	}

	radiusM := 0
	if raw := r.URL.Query().Get("radius_m"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			radiusM = v
		}
	}

	p := pagination.ParseCursorParams(r)

	result, err := h.svc.Nearby(r.Context(), NearbyParams{
		Lat:     lat,
		Lng:     lng,
		RadiusM: radiusM,
		Limit:   p.Limit,
	})
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"data": result})
}

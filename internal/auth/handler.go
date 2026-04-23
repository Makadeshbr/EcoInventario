package auth

import (
	"encoding/json"
	"net/http"

	"github.com/allan/ecoinventario/internal/shared/response"
	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// Handler expõe os endpoints HTTP de autenticação.
type Handler struct {
	svc *Service
}

// NewHandler cria o handler de auth.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleLogin processa POST /api/v1/auth/login.
func (h *Handler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, r, "JSON inválido")
		return
	}
	if err := validate.Struct(req); err != nil {
		response.ValidationError(w, r, err)
		return
	}

	resp, err := h.svc.Login(r.Context(), req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, resp)
}

// HandleRefresh processa POST /api/v1/auth/refresh.
func (h *Handler) HandleRefresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, r, "JSON inválido")
		return
	}
	if err := validate.Struct(req); err != nil {
		response.ValidationError(w, r, err)
		return
	}

	resp, err := h.svc.RefreshToken(r.Context(), req)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, resp)
}

// HandleLogout processa POST /api/v1/auth/logout.
func (h *Handler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, r, "JSON inválido")
		return
	}
	if err := validate.Struct(req); err != nil {
		response.ValidationError(w, r, err)
		return
	}

	if err := h.svc.Logout(r.Context(), req); err != nil {
		response.HandleError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

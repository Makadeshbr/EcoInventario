package public

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/allan/ecoinventario/internal/shared/response"
	"github.com/go-chi/chi/v5"
)

// Handler expõe os endpoints públicos (sem autenticação).
type Handler struct {
	svc *Service
}

// NewHandler cria o handler público.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// HandleListAssetTypes processa GET /api/v1/public/asset-types.
func (h *Handler) HandleListAssetTypes(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListAssetTypes(r.Context())
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	if items == nil {
		items = []AssetTypeItem{}
	}
	response.JSON(w, http.StatusOK, map[string]any{"data": items})
}

// HandleListAssets processa GET /api/v1/public/assets?bounds=sw_lat,sw_lng,ne_lat,ne_lng.
func (h *Handler) HandleListAssets(w http.ResponseWriter, r *http.Request) {
	boundsRaw := r.URL.Query().Get("bounds")
	if boundsRaw == "" {
		response.BadRequest(w, r, "parâmetro 'bounds' é obrigatório (sw_lat,sw_lng,ne_lat,ne_lng)")
		return
	}

	parts := strings.Split(boundsRaw, ",")
	if len(parts) != 4 {
		response.BadRequest(w, r, "'bounds' deve ter 4 coordenadas separadas por vírgula")
		return
	}

	coords := make([]float64, 4)
	for i, p := range parts {
		v, err := strconv.ParseFloat(strings.TrimSpace(p), 64)
		if err != nil {
			response.BadRequest(w, r, "'bounds' contém valor não numérico")
			return
		}
		coords[i] = v
	}

	limit := 100
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			limit = v
		}
	}

	p := BoundsParams{
		SWLat:  coords[0],
		SWLng:  coords[1],
		NELat:  coords[2],
		NELng:  coords[3],
		TypeID: r.URL.Query().Get("type_id"),
		Limit:  limit,
	}

	items, err := h.svc.ListAssets(r.Context(), p)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	if items == nil {
		items = []AssetSummary{}
	}
	response.JSON(w, http.StatusOK, map[string]any{"data": items})
}

// HandleGetAsset processa GET /api/v1/public/assets/{id}.
func (h *Handler) HandleGetAsset(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	detail, err := h.svc.GetAsset(r.Context(), id)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, detail)
}

// HandleResolveQR processa GET /api/v1/public/assets/resolve-qr?code=...
func (h *Handler) HandleResolveQR(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		response.BadRequest(w, r, "parâmetro 'code' é obrigatório")
		return
	}

	result, err := h.svc.ResolveQR(r.Context(), code)
	if err != nil {
		response.HandleError(w, r, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

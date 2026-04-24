package health

// TODO: Sem teste — config/infra (health check verifica conectividade real com DB e S3)

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"github.com/allan/ecoinventario/internal/shared/response"
)

// StoragePinger verifica a disponibilidade do storage.
type StoragePinger interface {
	Ping(ctx context.Context) error
}

// Handler responde ao health check do sistema.
type Handler struct {
	db        *sql.DB
	storage   StoragePinger
	startTime time.Time
}

// NewHandler cria o handler de health check.
func NewHandler(db *sql.DB, storage StoragePinger) *Handler {
	return &Handler{db: db, storage: storage, startTime: time.Now()}
}

// HandleHealth processa GET /api/v1/health.
// Verifica DB (ping) e storage (probe). Retorna 200 se tudo ok, 503 se degradado.
func (h *Handler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	dbStatus := "ok"
	storageStatus := "ok"
	overall := "ok"
	httpStatus := http.StatusOK

	if err := h.db.PingContext(ctx); err != nil {
		dbStatus = "error"
		overall = "degraded"
		httpStatus = http.StatusServiceUnavailable
	}

	if err := h.storage.Ping(ctx); err != nil {
		storageStatus = "error"
		overall = "degraded"
		httpStatus = http.StatusServiceUnavailable
	}

	uptime := int(time.Since(h.startTime).Seconds())

	body := map[string]any{
		"status": overall,
		"checks": map[string]string{
			"database": dbStatus,
			"storage":  storageStatus,
		},
		"uptime_seconds": uptime,
	}

	response.JSON(w, httpStatus, body)
}

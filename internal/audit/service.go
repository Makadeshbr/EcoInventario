package audit

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/shared/response"
)

// Entry é o input para registrar uma ação no audit log.
type Entry struct {
	OrganizationID string
	EntityType     string
	EntityID       string
	Action         string
	PerformedBy    string
	Changes        json.RawMessage
	Metadata       json.RawMessage
}

// Service registra entradas no audit log de forma não-bloqueante.
type Service struct {
	repo Repository
}

// NewService cria o serviço de audit.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// Log persiste a entrada no audit log.
// Erros são logados mas nunca propagados — não bloqueiam a operação principal.
func (s *Service) Log(ctx context.Context, e Entry) {
	entry := &LogEntry{
		OrganizationID: e.OrganizationID,
		EntityType:     e.EntityType,
		EntityID:       e.EntityID,
		Action:         e.Action,
		PerformedBy:    e.PerformedBy,
		Changes:        e.Changes,
		Metadata:       e.Metadata,
	}
	if err := s.repo.Insert(ctx, entry); err != nil {
		slog.Error("falha ao registrar audit log",
			"entity_type", e.EntityType,
			"entity_id", e.EntityID,
			"action", e.Action,
			"error", err,
		)
	}
}

type PerformedByRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Response struct {
	ID          string          `json:"id"`
	EntityType  string          `json:"entity_type"`
	EntityID    string          `json:"entity_id"`
	Action      string          `json:"action"`
	PerformedBy PerformedByRef  `json:"performed_by"`
	Changes     json.RawMessage `json:"changes,omitempty"`
	Metadata    json.RawMessage `json:"metadata,omitempty"`
	CreatedAt   string          `json:"created_at"`
}

func (s *Service) List(ctx context.Context, f ListFilters) (response.Paginated[Response], error) {
	if shared.GetRole(ctx) != shared.RoleAdmin {
		return response.Paginated[Response]{}, apperror.NewForbidden("apenas admin pode consultar auditoria")
	}
	orgID := shared.GetOrgID(ctx)
	if orgID == "" {
		return response.Paginated[Response]{}, apperror.NewForbidden("organizacao ausente no token")
	}
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 50
	}

	f.Limit++
	items, err := s.repo.List(ctx, orgID, f)
	if err != nil {
		return response.Paginated[Response]{}, err
	}
	f.Limit--

	out := make([]Response, len(items))
	for i, item := range items {
		out[i] = Response{
			ID:         item.ID,
			EntityType: item.EntityType,
			EntityID:   item.EntityID,
			Action:     item.Action,
			PerformedBy: PerformedByRef{
				ID:   item.PerformedBy,
				Name: item.PerformedByName,
			},
			Changes:   item.Changes,
			Metadata:  item.Metadata,
			CreatedAt: item.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	return response.NewPaginated(out, f.Limit, func(r Response) string { return r.ID }), nil
}

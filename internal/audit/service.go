package audit

import (
	"context"
	"encoding/json"
	"log/slog"
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

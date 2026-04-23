package assettype

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// Service implementa a lógica de negócio para tipos de ativo.
type Service struct {
	repo  Repository
	audit *audit.Service
}

// NewService cria o serviço de asset types.
func NewService(repo Repository, auditSvc *audit.Service) *Service {
	return &Service{repo: repo, audit: auditSvc}
}

// Create cria um novo tipo de ativo na organização.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*AssetTypeResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	existing, err := s.repo.FindByName(ctx, req.Name, orgID)
	if err != nil {
		return nil, fmt.Errorf("verificando nome: %w", err)
	}
	if existing != nil {
		return nil, apperror.NewConflict("Nome de tipo já existe nesta organização")
	}

	at := &AssetType{
		OrganizationID: orgID,
		Name:           req.Name,
		Description:    req.Description,
		IsActive:       true,
	}

	if err := s.repo.Insert(ctx, at); err != nil {
		return nil, fmt.Errorf("inserindo tipo: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset_type",
		EntityID:       at.ID,
		Action:         shared.AuditCreate,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"name": req.Name}),
	})

	resp := at.toResponse()
	return &resp, nil
}

// GetByID retorna um tipo de ativo pelo ID.
func (s *Service) GetByID(ctx context.Context, id string) (*AssetTypeResponse, error) {
	orgID := shared.GetOrgID(ctx)

	at, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando tipo: %w", err)
	}
	if at == nil {
		return nil, apperror.NewNotFound("asset_type", id)
	}

	resp := at.toResponse()
	return &resp, nil
}

// Update atualiza campos opcionais de um tipo de ativo.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*AssetTypeResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	at, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando tipo: %w", err)
	}
	if at == nil {
		return nil, apperror.NewNotFound("asset_type", id)
	}

	changes := map[string]any{}

	if req.Name != nil && *req.Name != at.Name {
		existing, err := s.repo.FindByName(ctx, *req.Name, orgID)
		if err != nil {
			return nil, fmt.Errorf("verificando nome: %w", err)
		}
		if existing != nil && existing.ID != id {
			return nil, apperror.NewConflict("Nome de tipo já existe nesta organização")
		}
		changes["name"] = map[string]string{"old": at.Name, "new": *req.Name}
		at.Name = *req.Name
	}
	if req.IsActive != nil {
		changes["is_active"] = map[string]any{"old": at.IsActive, "new": *req.IsActive}
		at.IsActive = *req.IsActive
	}

	if err := s.repo.Update(ctx, at); err != nil {
		return nil, fmt.Errorf("atualizando tipo: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset_type",
		EntityID:       at.ID,
		Action:         shared.AuditUpdate,
		PerformedBy:    callerID,
		Changes:        mustMarshal(changes),
	})

	resp := at.toResponse()
	return &resp, nil
}

// List retorna todos os tipos de ativo da organização.
func (s *Service) List(ctx context.Context) ([]AssetTypeResponse, error) {
	orgID := shared.GetOrgID(ctx)

	types, err := s.repo.List(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("listando tipos: %w", err)
	}

	resps := make([]AssetTypeResponse, len(types))
	for i, at := range types {
		resps[i] = at.toResponse()
	}
	return resps, nil
}

func mustMarshal(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

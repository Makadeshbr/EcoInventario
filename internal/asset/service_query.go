package asset

import (
	"context"
	"fmt"

	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/shared/response"
)

// GetByID retorna um asset com referências populadas.
// Viewer só enxerga assets com status=approved.
func (s *Service) GetByID(ctx context.Context, id string) (*Response, error) {
	orgID := shared.GetOrgID(ctx)
	role := shared.GetRole(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return nil, apperror.NewNotFound("asset", id)
	}
	if err := s.policy.ValidateViewerAccess(role, a, id); err != nil {
		return nil, err
	}

	resp := a.toResponse()
	return &resp, nil
}

// List lista assets da organização com filtros e paginação por cursor.
// Viewer enxerga apenas approved — ignora filtro de status recebido.
func (s *Service) List(ctx context.Context, f ListFilters) (response.Paginated[Response], error) {
	orgID := shared.GetOrgID(ctx)
	role := shared.GetRole(ctx)
	f.OrgID = orgID
	f.OnlyApproved = role == shared.RoleViewer

	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 20
	}

	f.Limit++
	assets, err := s.repo.List(ctx, f)
	if err != nil {
		return response.Paginated[Response]{}, fmt.Errorf("listando assets: %w", err)
	}
	f.Limit--

	resps := make([]Response, len(assets))
	for i, a := range assets {
		resps[i] = a.toResponse()
	}

	return response.NewPaginated(resps, f.Limit, func(r Response) string { return r.ID }), nil
}

// Nearby busca assets approved dentro de um raio em metros, ordenados por distância.
func (s *Service) Nearby(ctx context.Context, p NearbyParams) ([]Response, error) {
	orgID := shared.GetOrgID(ctx)
	p.OrgID = orgID

	if p.Limit <= 0 || p.Limit > 100 {
		p.Limit = 20
	}
	if p.RadiusM <= 0 {
		p.RadiusM = 5000
	}
	if p.RadiusM > 50000 {
		p.RadiusM = 50000
	}

	assets, err := s.repo.Nearby(ctx, p)
	if err != nil {
		return nil, fmt.Errorf("nearby: %w", err)
	}

	resps := make([]Response, len(assets))
	for i, a := range assets {
		resps[i] = a.toResponse()
	}
	return resps, nil
}

// History retorna a cadeia completa de versões do asset.
// Viewer não tem acesso se o asset base não é approved.
func (s *Service) History(ctx context.Context, id string) ([]HistoryEntry, error) {
	orgID := shared.GetOrgID(ctx)
	role := shared.GetRole(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return nil, apperror.NewNotFound("asset", id)
	}
	if err := s.policy.ValidateViewerAccess(role, a, id); err != nil {
		return nil, err
	}

	return s.repo.History(ctx, id, orgID)
}

package stats

import (
	"context"

	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

type Repository interface {
	Dashboard(ctx context.Context, q Query) (*DashboardStats, error)
}

type dashboardReader interface {
	Dashboard(ctx context.Context) (*DashboardStats, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Dashboard(ctx context.Context) (*DashboardStats, error) {
	orgID := shared.GetOrgID(ctx)
	if orgID == "" {
		return nil, apperror.NewForbidden("organizacao ausente no token")
	}

	return s.repo.Dashboard(ctx, Query{
		OrgID:        orgID,
		OnlyApproved: shared.GetRole(ctx) == shared.RoleViewer,
	})
}

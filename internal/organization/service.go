package organization

import (
	"context"
	"fmt"

	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// Service expõe operações de domínio para organizações.
type Service struct {
	repo Repository
}

// NewService cria o serviço de organizações.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// GetByID retorna a organização pelo ID ou 404.
func (s *Service) GetByID(ctx context.Context, id string) (*Organization, error) {
	org, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscando organização: %w", err)
	}
	if org == nil {
		return nil, apperror.NewNotFound("organization", id)
	}
	return org, nil
}

package user

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/auth"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/shared/response"
)

// Service implementa a lógica de negócio para usuários.
type Service struct {
	repo   Repository
	audit  *audit.Service
	pepper string
}

// NewService cria o serviço de usuários.
func NewService(repo Repository, auditSvc *audit.Service, pepper string) *Service {
	return &Service{repo: repo, audit: auditSvc, pepper: pepper}
}

// Create cria um novo usuário na organização do admin autenticado.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*UserResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	existing, err := s.repo.FindByEmail(ctx, strings.ToLower(req.Email), orgID)
	if err != nil {
		return nil, fmt.Errorf("verificando email: %w", err)
	}
	if existing != nil {
		return nil, apperror.NewConflict("Email já cadastrado nesta organização")
	}

	hash, err := auth.HashPassword(req.Password, s.pepper)
	if err != nil {
		return nil, fmt.Errorf("hashing senha: %w", err)
	}

	u := &User{
		OrganizationID: orgID,
		Name:           req.Name,
		Email:          strings.ToLower(req.Email),
		PasswordHash:   hash,
		Role:           req.Role,
		IsActive:       true,
	}

	if err := s.repo.Insert(ctx, u); err != nil {
		return nil, fmt.Errorf("inserindo usuário: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "user",
		EntityID:       u.ID,
		Action:         shared.AuditCreate,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"role": req.Role, "email": u.Email}),
	})

	resp := u.toResponse()
	return &resp, nil
}

// GetByID retorna um usuário da organização pelo ID.
func (s *Service) GetByID(ctx context.Context, id string) (*UserResponse, error) {
	orgID := shared.GetOrgID(ctx)

	u, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando usuário: %w", err)
	}
	if u == nil {
		return nil, apperror.NewNotFound("user", id)
	}

	resp := u.toResponse()
	return &resp, nil
}

// Update atualiza campos opcionais de um usuário.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*UserResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	u, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando usuário: %w", err)
	}
	if u == nil {
		return nil, apperror.NewNotFound("user", id)
	}

	changes := map[string]any{}
	if req.Name != nil {
		changes["name"] = map[string]string{"old": u.Name, "new": *req.Name}
		u.Name = *req.Name
	}
	if req.Role != nil {
		changes["role"] = map[string]string{"old": u.Role, "new": *req.Role}
		u.Role = *req.Role
	}
	if req.IsActive != nil {
		changes["is_active"] = map[string]any{"old": u.IsActive, "new": *req.IsActive}
		u.IsActive = *req.IsActive
	}

	if err := s.repo.Update(ctx, u); err != nil {
		return nil, fmt.Errorf("atualizando usuário: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "user",
		EntityID:       u.ID,
		Action:         shared.AuditUpdate,
		PerformedBy:    callerID,
		Changes:        mustMarshal(changes),
	})

	resp := u.toResponse()
	return &resp, nil
}

// SoftDelete marca o usuário como deletado.
func (s *Service) SoftDelete(ctx context.Context, id string) error {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	u, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return fmt.Errorf("buscando usuário: %w", err)
	}
	if u == nil {
		return apperror.NewNotFound("user", id)
	}

	if err := s.repo.SoftDelete(ctx, id, orgID); err != nil {
		return fmt.Errorf("deletando usuário: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "user",
		EntityID:       id,
		Action:         shared.AuditDelete,
		PerformedBy:    callerID,
	})

	return nil
}

// List retorna usuários da organização com filtros e paginação.
func (s *Service) List(ctx context.Context, f ListFilters) (response.Paginated[UserResponse], error) {
	orgID := shared.GetOrgID(ctx)
	f.OrgID = orgID

	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 20
	}

	// busca limit+1 para detectar has_more
	f.Limit++
	users, err := s.repo.List(ctx, f)
	if err != nil {
		return response.Paginated[UserResponse]{}, fmt.Errorf("listando usuários: %w", err)
	}
	f.Limit--

	resps := make([]UserResponse, len(users))
	for i, u := range users {
		resps[i] = u.toResponse()
	}

	return response.NewPaginated(resps, f.Limit, func(u UserResponse) string {
		return u.ID
	}), nil
}

func mustMarshal(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

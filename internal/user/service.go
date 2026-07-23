package user

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/auth"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/shared/response"
	"github.com/jackc/pgx/v5/pgconn"
)

// SessionRevoker derruba os refresh tokens de um usuário. Necessário no reset
// de senha: sem isso, uma sessão já vazada continuaria se renovando após a troca.
type SessionRevoker interface {
	RevokeAllForUser(ctx context.Context, userID string) error
}

// Service implementa a lógica de negócio para usuários.
type Service struct {
	repo     Repository
	audit    *audit.Service
	pepper   string
	policy   adminMutationPolicy
	sessions SessionRevoker
}

// NewService cria o serviço de usuários.
func NewService(repo Repository, auditSvc *audit.Service, pepper string, sessions SessionRevoker) *Service {
	return &Service{
		repo:     repo,
		audit:    auditSvc,
		pepper:   pepper,
		policy:   adminMutationPolicy{},
		sessions: sessions,
	}
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
		if isEmailUniqueViolation(err) {
			return nil, apperror.NewConflict("Email ja cadastrado nesta organizacao")
		}
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

	if err := s.ensureAdminUpdateAllowed(ctx, orgID, callerID, u, req); err != nil {
		return nil, err
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

	passwordReset := req.Password != nil
	var newHash string
	if passwordReset {
		h, err := auth.HashPassword(*req.Password, s.pepper)
		if err != nil {
			return nil, fmt.Errorf("hashing senha: %w", err)
		}
		newHash = h
		// Marcador para a auditoria: registra o evento, nunca o valor.
		changes["password"] = "redefinida pelo admin"
	}

	if err := s.repo.Update(ctx, u); err != nil {
		return nil, fmt.Errorf("atualizando usuário: %w", err)
	}

	// A senha vai em comando próprio: o Update geral não grava password_hash.
	if passwordReset {
		if err := s.repo.UpdatePassword(ctx, u.ID, orgID, newHash); err != nil {
			return nil, fmt.Errorf("gravando nova senha: %w", err)
		}
		u.PasswordHash = newHash
	}

	// Revoga depois de gravar: se falhar, o admin recebe erro e pode repetir a
	// operação (é idempotente). O access token em circulação só expira sozinho,
	// por ser stateless — a janela é o tempo de vida dele.
	if passwordReset {
		if err := s.sessions.RevokeAllForUser(ctx, u.ID); err != nil {
			return nil, fmt.Errorf("revogando sessões após reset de senha: %w", err)
		}
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

	if err := s.ensureAdminDeleteAllowed(ctx, orgID, callerID, u); err != nil {
		return err
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

func (s *Service) ensureAdminUpdateAllowed(ctx context.Context, orgID, callerID string, u *User, req UpdateRequest) error {
	if err := s.policy.ValidateSelfUpdate(callerID, u, req); err != nil {
		return err
	}
	if !s.policy.UpdateRequiresOtherActiveAdmin(u, req) {
		return nil
	}

	hasOtherAdmin, err := s.repo.HasOtherActiveAdmin(ctx, orgID, u.ID)
	if err != nil {
		return fmt.Errorf("verificando admins ativos: %w", err)
	}
	return s.policy.ValidateOrganizationKeepsAdmin(hasOtherAdmin)
}

func (s *Service) ensureAdminDeleteAllowed(ctx context.Context, orgID, callerID string, u *User) error {
	if err := s.policy.ValidateSelfDelete(callerID, u); err != nil {
		return err
	}
	if !s.policy.DeleteRequiresOtherActiveAdmin(u) {
		return nil
	}

	hasOtherAdmin, err := s.repo.HasOtherActiveAdmin(ctx, orgID, u.ID)
	if err != nil {
		return fmt.Errorf("verificando admins ativos: %w", err)
	}
	return s.policy.ValidateOrganizationKeepsAdmin(hasOtherAdmin)
}

func mustMarshal(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

func isEmailUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}

	return pgErr.Code == "23505" &&
		(pgErr.ConstraintName == "users_email_organization_id_key" ||
			pgErr.ConstraintName == "users_email_organization_id_active_key")
}

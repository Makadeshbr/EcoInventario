package manejo

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/shared/response"
)

// AssetChecker verifica se um asset existe na organização.
type AssetChecker interface {
	ExistsInOrg(ctx context.Context, id, orgID string) (bool, error)
}

// MediaChecker verifica se uma mídia pertence ao asset indicado.
type MediaChecker interface {
	BelongsToAsset(ctx context.Context, mediaID, assetID, orgID string) (bool, error)
}

// Service implementa a lógica de negócio para manejos.
type Service struct {
	repo  Repository
	asset AssetChecker
	media MediaChecker
	audit *audit.Service
}

// NewService cria o serviço de manejos.
func NewService(repo Repository, asset AssetChecker, media MediaChecker, auditSvc *audit.Service) *Service {
	return &Service{repo: repo, asset: asset, media: media, audit: auditSvc}
}

// Create cria um novo manejo em status draft.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*Response, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	if err := s.ensureAssetInOrg(ctx, req.AssetID, orgID); err != nil {
		return nil, err
	}
	if err := s.validateMediaRef(ctx, req.BeforeMediaID, req.AssetID, orgID, "before_media_id"); err != nil {
		return nil, err
	}
	if err := s.validateMediaRef(ctx, req.AfterMediaID, req.AssetID, orgID, "after_media_id"); err != nil {
		return nil, err
	}

	m := &Manejo{
		OrganizationID: orgID,
		AssetID:        req.AssetID,
		Description:    req.Description,
		BeforeMediaID:  req.BeforeMediaID,
		AfterMediaID:   req.AfterMediaID,
		Status:         shared.StatusDraft,
		CreatedBy:      callerID,
	}
	if err := s.repo.Insert(ctx, m); err != nil {
		return nil, fmt.Errorf("inserindo manejo: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "manejo",
		EntityID:       m.ID,
		Action:         shared.AuditCreate,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": m.Status}),
	})

	full, err := s.repo.FindByID(ctx, m.ID, orgID)
	if err != nil || full == nil {
		resp := m.toResponse()
		return &resp, nil
	}
	resp := full.toResponse()
	return &resp, nil
}

// GetByID retorna um manejo com referências populadas.
// Viewer só enxerga manejos com status=approved.
func (s *Service) GetByID(ctx context.Context, id string) (*Response, error) {
	orgID := shared.GetOrgID(ctx)
	role := shared.GetRole(ctx)

	m, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando manejo: %w", err)
	}
	if m == nil {
		return nil, apperror.NewNotFound("manejo", id)
	}
	if role == shared.RoleViewer && m.Status != shared.StatusApproved {
		return nil, apperror.NewNotFound("manejo", id)
	}
	resp := m.toResponse()
	return &resp, nil
}

// Update aplica correções a um manejo. Apenas draft e rejected são editáveis.
// Manejos aprovados são imutáveis (sem versionamento).
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*Response, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	current, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando manejo: %w", err)
	}
	if current == nil {
		return nil, apperror.NewNotFound("manejo", id)
	}

	switch current.Status {
	case shared.StatusPending, shared.StatusApproved:
		return nil, apperror.NewInvalidStatusTransition(current.Status, "editing")
	case shared.StatusDraft, shared.StatusRejected:
		if role == shared.RoleTech && current.CreatedBy != callerID {
			return nil, apperror.NewForbidden("Você só pode editar seus próprios manejos")
		}
	default:
		return nil, apperror.NewInvalidStatusTransition(current.Status, "editing")
	}

	if req.BeforeMediaID != nil {
		if err := s.validateMediaRef(ctx, req.BeforeMediaID, current.AssetID, orgID, "before_media_id"); err != nil {
			return nil, err
		}
	}
	if req.AfterMediaID != nil {
		if err := s.validateMediaRef(ctx, req.AfterMediaID, current.AssetID, orgID, "after_media_id"); err != nil {
			return nil, err
		}
	}

	changes := map[string]any{}
	if req.Description != nil && *req.Description != current.Description {
		changes["description"] = map[string]string{"old": current.Description, "new": *req.Description}
		current.Description = *req.Description
	}
	if req.BeforeMediaID != nil {
		changes["before_media_id"] = req.BeforeMediaID
		current.BeforeMediaID = req.BeforeMediaID
	}
	if req.AfterMediaID != nil {
		changes["after_media_id"] = req.AfterMediaID
		current.AfterMediaID = req.AfterMediaID
	}

	if err := s.repo.Update(ctx, current); err != nil {
		return nil, fmt.Errorf("atualizando manejo: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "manejo",
		EntityID:       current.ID,
		Action:         shared.AuditUpdate,
		PerformedBy:    callerID,
		Changes:        mustMarshal(changes),
	})

	full, err := s.repo.FindByID(ctx, current.ID, orgID)
	if err != nil || full == nil {
		resp := current.toResponse()
		return &resp, nil
	}
	resp := full.toResponse()
	return &resp, nil
}

// SoftDelete marca um manejo como deletado. Apenas status=draft.
func (s *Service) SoftDelete(ctx context.Context, id string) error {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	m, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return fmt.Errorf("buscando manejo: %w", err)
	}
	if m == nil {
		return apperror.NewNotFound("manejo", id)
	}
	if m.Status != shared.StatusDraft {
		return &apperror.AppError{
			Code:    "UNPROCESSABLE_ENTITY",
			Message: "Apenas manejos em draft podem ser deletados",
			Status:  422,
		}
	}
	if role == shared.RoleTech && m.CreatedBy != callerID {
		return apperror.NewForbidden("Você só pode deletar seus próprios manejos")
	}

	if err := s.repo.SoftDelete(ctx, id, orgID); err != nil {
		return fmt.Errorf("deletando manejo: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "manejo",
		EntityID:       id,
		Action:         shared.AuditDelete,
		PerformedBy:    callerID,
	})
	return nil
}

// Submit transiciona draft→pending.
func (s *Service) Submit(ctx context.Context, id string) (*StatusResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	m, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando manejo: %w", err)
	}
	if m == nil {
		return nil, apperror.NewNotFound("manejo", id)
	}
	if m.Status != shared.StatusDraft {
		return nil, apperror.NewInvalidStatusTransition(m.Status, shared.StatusPending)
	}
	if role == shared.RoleTech && m.CreatedBy != callerID {
		return nil, apperror.NewForbidden("Você só pode submeter seus próprios manejos")
	}

	m.Status = shared.StatusPending
	if err := s.repo.UpdateStatus(ctx, m); err != nil {
		return nil, fmt.Errorf("atualizando status: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "manejo",
		EntityID:       m.ID,
		Action:         shared.AuditSubmit,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": map[string]string{"old": shared.StatusDraft, "new": shared.StatusPending}}),
	})

	return &StatusResponse{ID: m.ID, Status: m.Status}, nil
}

// Approve transiciona pending→approved. ADMIN only.
func (s *Service) Approve(ctx context.Context, id string) (*StatusResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	m, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando manejo: %w", err)
	}
	if m == nil {
		return nil, apperror.NewNotFound("manejo", id)
	}
	if m.Status != shared.StatusPending {
		return nil, apperror.NewInvalidStatusTransition(m.Status, shared.StatusApproved)
	}

	approver := callerID
	m.Status = shared.StatusApproved
	m.ApprovedBy = &approver
	if err := s.repo.UpdateStatus(ctx, m); err != nil {
		return nil, fmt.Errorf("atualizando status: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "manejo",
		EntityID:       m.ID,
		Action:         shared.AuditApprove,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": map[string]string{"old": shared.StatusPending, "new": shared.StatusApproved}}),
	})

	return &StatusResponse{ID: m.ID, Status: m.Status, ApprovedBy: &approver}, nil
}

// Reject transiciona pending→rejected. ADMIN only.
func (s *Service) Reject(ctx context.Context, id string, req RejectRequest) (*RejectResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	m, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando manejo: %w", err)
	}
	if m == nil {
		return nil, apperror.NewNotFound("manejo", id)
	}
	if m.Status != shared.StatusPending {
		return nil, apperror.NewInvalidStatusTransition(m.Status, shared.StatusRejected)
	}

	reason := req.Reason
	m.Status = shared.StatusRejected
	m.RejectionReason = &reason
	if err := s.repo.UpdateStatus(ctx, m); err != nil {
		return nil, fmt.Errorf("atualizando status: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "manejo",
		EntityID:       m.ID,
		Action:         shared.AuditReject,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": map[string]string{"old": shared.StatusPending, "new": shared.StatusRejected}, "reason": reason}),
	})

	return &RejectResponse{ID: m.ID, Status: m.Status, RejectionReason: reason}, nil
}

// List lista manejos com filtros e paginação por cursor.
func (s *Service) List(ctx context.Context, f ListFilters) (response.Paginated[Response], error) {
	orgID := shared.GetOrgID(ctx)
	role := shared.GetRole(ctx)
	f.OrgID = orgID
	f.OnlyApproved = role == shared.RoleViewer

	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 20
	}

	f.Limit++
	items, err := s.repo.List(ctx, f)
	if err != nil {
		return response.Paginated[Response]{}, fmt.Errorf("listando manejos: %w", err)
	}
	f.Limit--

	resps := make([]Response, len(items))
	for i, m := range items {
		resps[i] = m.toResponse()
	}
	return response.NewPaginated(resps, f.Limit, func(r Response) string { return r.ID }), nil
}

func (s *Service) ensureAssetInOrg(ctx context.Context, assetID, orgID string) error {
	ok, err := s.asset.ExistsInOrg(ctx, assetID, orgID)
	if err != nil {
		return fmt.Errorf("verificando asset: %w", err)
	}
	if !ok {
		return apperror.NewValidation("asset_id não existe na organização")
	}
	return nil
}

func (s *Service) validateMediaRef(ctx context.Context, mediaID *string, assetID, orgID, field string) error {
	if mediaID == nil {
		return nil
	}
	belongs, err := s.media.BelongsToAsset(ctx, *mediaID, assetID, orgID)
	if err != nil {
		return fmt.Errorf("verificando %s: %w", field, err)
	}
	if !belongs {
		return &apperror.AppError{
			Code:    "UNPROCESSABLE_ENTITY",
			Message: fmt.Sprintf("%s não pertence ao asset informado", field),
			Status:  422,
		}
	}
	return nil
}

func mustMarshal(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

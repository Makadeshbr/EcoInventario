package monitoramento

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

// validHealthStatuses contém os valores aceitos para health_status.
var validHealthStatuses = map[string]bool{
	shared.HealthHealthy:  true,
	shared.HealthWarning:  true,
	shared.HealthCritical: true,
	shared.HealthDead:     true,
}

// Service implementa a lógica de negócio para monitoramentos.
type Service struct {
	repo  Repository
	asset AssetChecker
	audit *audit.Service
}

// NewService cria o serviço de monitoramentos.
func NewService(repo Repository, asset AssetChecker, auditSvc *audit.Service) *Service {
	return &Service{repo: repo, asset: asset, audit: auditSvc}
}

// Create cria um novo monitoramento em status draft.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*Response, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	if !validHealthStatuses[req.HealthStatus] {
		return nil, apperror.NewValidation("health_status inválido: deve ser healthy, warning, critical ou dead")
	}

	if err := s.ensureAssetInOrg(ctx, req.AssetID, orgID); err != nil {
		return nil, err
	}

	m := &Monitoramento{
		OrganizationID: orgID,
		AssetID:        req.AssetID,
		Notes:          req.Notes,
		HealthStatus:   req.HealthStatus,
		Status:         shared.StatusDraft,
		CreatedBy:      callerID,
	}
	if err := s.repo.Insert(ctx, m); err != nil {
		return nil, fmt.Errorf("inserindo monitoramento: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "monitoramento",
		EntityID:       m.ID,
		Action:         shared.AuditCreate,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": m.Status, "health_status": m.HealthStatus}),
	})

	full, err := s.repo.FindByID(ctx, m.ID, orgID)
	if err != nil || full == nil {
		resp := m.toResponse()
		return &resp, nil
	}
	resp := full.toResponse()
	return &resp, nil
}

// GetByID retorna um monitoramento com referências populadas.
// Viewer só enxerga monitoramentos com status=approved.
func (s *Service) GetByID(ctx context.Context, id string) (*Response, error) {
	orgID := shared.GetOrgID(ctx)
	role := shared.GetRole(ctx)

	m, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando monitoramento: %w", err)
	}
	if m == nil {
		return nil, apperror.NewNotFound("monitoramento", id)
	}
	if role == shared.RoleViewer && m.Status != shared.StatusApproved {
		return nil, apperror.NewNotFound("monitoramento", id)
	}
	resp := m.toResponse()
	return &resp, nil
}

// Update aplica correções a um monitoramento. Apenas draft e rejected são editáveis.
// Monitoramentos aprovados são imutáveis (sem versionamento).
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*Response, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	current, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando monitoramento: %w", err)
	}
	if current == nil {
		return nil, apperror.NewNotFound("monitoramento", id)
	}

	switch current.Status {
	case shared.StatusPending, shared.StatusApproved:
		return nil, apperror.NewInvalidStatusTransition(current.Status, "editing")
	case shared.StatusDraft, shared.StatusRejected:
		if role == shared.RoleTech && current.CreatedBy != callerID {
			return nil, apperror.NewForbidden("Você só pode editar seus próprios monitoramentos")
		}
	default:
		return nil, apperror.NewInvalidStatusTransition(current.Status, "editing")
	}

	if req.HealthStatus != nil && !validHealthStatuses[*req.HealthStatus] {
		return nil, apperror.NewValidation("health_status inválido: deve ser healthy, warning, critical ou dead")
	}

	changes := map[string]any{}
	if req.Notes != nil && *req.Notes != current.Notes {
		changes["notes"] = map[string]string{"old": current.Notes, "new": *req.Notes}
		current.Notes = *req.Notes
	}
	if req.HealthStatus != nil && *req.HealthStatus != current.HealthStatus {
		changes["health_status"] = map[string]string{"old": current.HealthStatus, "new": *req.HealthStatus}
		current.HealthStatus = *req.HealthStatus
	}

	if err := s.repo.Update(ctx, current); err != nil {
		return nil, fmt.Errorf("atualizando monitoramento: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "monitoramento",
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

// SoftDelete marca um monitoramento como deletado. Apenas status=draft.
func (s *Service) SoftDelete(ctx context.Context, id string) error {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	m, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return fmt.Errorf("buscando monitoramento: %w", err)
	}
	if m == nil {
		return apperror.NewNotFound("monitoramento", id)
	}
	if m.Status != shared.StatusDraft {
		return &apperror.AppError{
			Code:    "UNPROCESSABLE_ENTITY",
			Message: "Apenas monitoramentos em draft podem ser deletados",
			Status:  422,
		}
	}
	if role == shared.RoleTech && m.CreatedBy != callerID {
		return apperror.NewForbidden("Você só pode deletar seus próprios monitoramentos")
	}

	if err := s.repo.SoftDelete(ctx, id, orgID); err != nil {
		return fmt.Errorf("deletando monitoramento: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "monitoramento",
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
		return nil, fmt.Errorf("buscando monitoramento: %w", err)
	}
	if m == nil {
		return nil, apperror.NewNotFound("monitoramento", id)
	}
	if m.Status != shared.StatusDraft {
		return nil, apperror.NewInvalidStatusTransition(m.Status, shared.StatusPending)
	}
	if role == shared.RoleTech && m.CreatedBy != callerID {
		return nil, apperror.NewForbidden("Você só pode submeter seus próprios monitoramentos")
	}

	m.Status = shared.StatusPending
	if err := s.repo.UpdateStatus(ctx, m); err != nil {
		return nil, fmt.Errorf("atualizando status: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "monitoramento",
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
		return nil, fmt.Errorf("buscando monitoramento: %w", err)
	}
	if m == nil {
		return nil, apperror.NewNotFound("monitoramento", id)
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
		EntityType:     "monitoramento",
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
		return nil, fmt.Errorf("buscando monitoramento: %w", err)
	}
	if m == nil {
		return nil, apperror.NewNotFound("monitoramento", id)
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
		EntityType:     "monitoramento",
		EntityID:       m.ID,
		Action:         shared.AuditReject,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": map[string]string{"old": shared.StatusPending, "new": shared.StatusRejected}, "reason": reason}),
	})

	return &RejectResponse{ID: m.ID, Status: m.Status, RejectionReason: reason}, nil
}

// List lista monitoramentos com filtros e paginação por cursor.
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
		return response.Paginated[Response]{}, fmt.Errorf("listando monitoramentos: %w", err)
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

func mustMarshal(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

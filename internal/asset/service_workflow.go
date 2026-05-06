package asset

import (
	"context"
	"fmt"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// Submit transiciona draft→pending. TECH dono ou ADMIN.
func (s *Service) Submit(ctx context.Context, id string) (*StatusResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return nil, apperror.NewNotFound("asset", id)
	}
	if err := s.policy.ValidateSubmit(a, role, callerID); err != nil {
		return nil, err
	}

	hasMedia, err := s.media.HasUploadedMedia(ctx, a.ID)
	if err != nil {
		return nil, fmt.Errorf("verificando mídia: %w", err)
	}
	if !hasMedia {
		return nil, &apperror.AppError{
			Code:    "UNPROCESSABLE_ENTITY",
			Message: "Submit exige ao menos uma mídia carregada",
			Status:  422,
		}
	}

	a.Status = shared.StatusPending
	if err := s.repo.UpdateStatus(ctx, a); err != nil {
		return nil, fmt.Errorf("atualizando status: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset",
		EntityID:       a.ID,
		Action:         shared.AuditSubmit,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": map[string]string{"old": shared.StatusDraft, "new": shared.StatusPending}}),
	})

	return &StatusResponse{ID: a.ID, Status: a.Status}, nil
}

// Approve transiciona pending→approved. ADMIN only. Preenche approved_by.
func (s *Service) Approve(ctx context.Context, id string) (*StatusResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return nil, apperror.NewNotFound("asset", id)
	}
	if err := s.policy.ValidateApprove(a, role); err != nil {
		return nil, err
	}

	approver := callerID
	a.Status = shared.StatusApproved
	a.ApprovedBy = &approver
	if err := s.repo.UpdateStatus(ctx, a); err != nil {
		return nil, fmt.Errorf("atualizando status: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset",
		EntityID:       a.ID,
		Action:         shared.AuditApprove,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": map[string]string{"old": shared.StatusPending, "new": shared.StatusApproved}}),
	})

	return &StatusResponse{ID: a.ID, Status: a.Status, ApprovedBy: &approver}, nil
}

// Reject transiciona pending→rejected. ADMIN only. Requer motivo.
func (s *Service) Reject(ctx context.Context, id string, req RejectRequest) (*RejectResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return nil, apperror.NewNotFound("asset", id)
	}
	if err := s.policy.ValidateReject(a, role); err != nil {
		return nil, err
	}

	reason := req.Reason
	a.Status = shared.StatusRejected
	a.RejectionReason = &reason
	if err := s.repo.UpdateStatus(ctx, a); err != nil {
		return nil, fmt.Errorf("atualizando status: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset",
		EntityID:       a.ID,
		Action:         shared.AuditReject,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": map[string]string{"old": shared.StatusPending, "new": shared.StatusRejected}, "reason": reason}),
	})

	return &RejectResponse{ID: a.ID, Status: a.Status, RejectionReason: reason}, nil
}

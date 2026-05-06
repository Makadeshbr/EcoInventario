package manejo

import (
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

type manejoMutationPolicy struct{}

func (manejoMutationPolicy) ValidateViewerAccess(role string, m *Manejo, id string) error {
	if role == shared.RoleViewer && m.Status != shared.StatusApproved {
		return apperror.NewNotFound("manejo", id)
	}
	return nil
}

func (manejoMutationPolicy) ValidateUpdate(m *Manejo, role, callerID string) error {
	switch m.Status {
	case shared.StatusPending, shared.StatusApproved:
		return apperror.NewInvalidStatusTransition(m.Status, "editing")
	case shared.StatusDraft, shared.StatusRejected:
		if role == shared.RoleTech && m.CreatedBy != callerID {
			return apperror.NewForbidden("Você só pode editar seus próprios manejos")
		}
		return nil
	default:
		return apperror.NewInvalidStatusTransition(m.Status, "editing")
	}
}

func (manejoMutationPolicy) ValidateSoftDelete(m *Manejo, role, callerID string) error {
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
	return nil
}

func (manejoMutationPolicy) ValidateSubmit(m *Manejo, role, callerID string) error {
	// Permite re-submissão de manejos rejeitados (TECH corrige e submete novamente).
	if m.Status != shared.StatusDraft && m.Status != shared.StatusRejected {
		return apperror.NewInvalidStatusTransition(m.Status, shared.StatusPending)
	}
	if role == shared.RoleTech && m.CreatedBy != callerID {
		return apperror.NewForbidden("Você só pode submeter seus próprios manejos")
	}
	return nil
}

func (manejoMutationPolicy) ValidateApprove(m *Manejo) error {
	if m.Status != shared.StatusPending {
		return apperror.NewInvalidStatusTransition(m.Status, shared.StatusApproved)
	}
	return nil
}

func (manejoMutationPolicy) ValidateReject(m *Manejo) error {
	if m.Status != shared.StatusPending {
		return apperror.NewInvalidStatusTransition(m.Status, shared.StatusRejected)
	}
	return nil
}

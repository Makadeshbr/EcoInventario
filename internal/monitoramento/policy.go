package monitoramento

import (
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

type monitoramentoMutationPolicy struct{}

func (monitoramentoMutationPolicy) ValidateViewerAccess(role string, m *Monitoramento, id string) error {
	if role == shared.RoleViewer && m.Status != shared.StatusApproved {
		return apperror.NewNotFound("monitoramento", id)
	}
	return nil
}

func (monitoramentoMutationPolicy) ValidateUpdate(m *Monitoramento, role, callerID string) error {
	switch m.Status {
	case shared.StatusPending, shared.StatusApproved:
		return apperror.NewInvalidStatusTransition(m.Status, "editing")
	case shared.StatusDraft, shared.StatusRejected:
		if role == shared.RoleTech && m.CreatedBy != callerID {
			return apperror.NewForbidden("Você só pode editar seus próprios monitoramentos")
		}
		return nil
	default:
		return apperror.NewInvalidStatusTransition(m.Status, "editing")
	}
}

func (monitoramentoMutationPolicy) ValidateSoftDelete(m *Monitoramento, role, callerID string) error {
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
	return nil
}

func (monitoramentoMutationPolicy) ValidateSubmit(m *Monitoramento, role, callerID string) error {
	// Permite re-submissão de monitoramentos rejeitados (TECH corrige e submete novamente).
	if m.Status != shared.StatusDraft && m.Status != shared.StatusRejected {
		return apperror.NewInvalidStatusTransition(m.Status, shared.StatusPending)
	}
	if role == shared.RoleTech && m.CreatedBy != callerID {
		return apperror.NewForbidden("Você só pode submeter seus próprios monitoramentos")
	}
	return nil
}

func (monitoramentoMutationPolicy) ValidateApprove(m *Monitoramento) error {
	if m.Status != shared.StatusPending {
		return apperror.NewInvalidStatusTransition(m.Status, shared.StatusApproved)
	}
	return nil
}

func (monitoramentoMutationPolicy) ValidateReject(m *Monitoramento) error {
	if m.Status != shared.StatusPending {
		return apperror.NewInvalidStatusTransition(m.Status, shared.StatusRejected)
	}
	return nil
}

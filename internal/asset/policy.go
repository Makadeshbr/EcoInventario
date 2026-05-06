package asset

import (
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

type assetUpdateMode int

const (
	assetUpdateInPlace assetUpdateMode = iota
	assetUpdateNewVersion
)

type assetMutationPolicy struct{}

func (assetMutationPolicy) ValidateViewerAccess(role string, a *Asset, id string) error {
	if role == shared.RoleViewer && a.Status != shared.StatusApproved {
		return apperror.NewNotFound("asset", id)
	}
	return nil
}

func (assetMutationPolicy) ValidateUpdate(a *Asset, role, callerID string) (assetUpdateMode, error) {
	switch a.Status {
	case shared.StatusPending:
		return assetUpdateInPlace, apperror.NewInvalidStatusTransition(a.Status, "editing")
	case shared.StatusApproved:
		if role != shared.RoleAdmin {
			return assetUpdateInPlace, apperror.NewForbidden("Apenas admin pode editar asset aprovado")
		}
		return assetUpdateNewVersion, nil
	case shared.StatusDraft, shared.StatusRejected:
		if role == shared.RoleTech && a.CreatedBy != callerID {
			return assetUpdateInPlace, apperror.NewForbidden("Você só pode editar seus próprios assets")
		}
		return assetUpdateInPlace, nil
	default:
		return assetUpdateInPlace, apperror.NewInvalidStatusTransition(a.Status, "editing")
	}
}

func (assetMutationPolicy) ValidateSoftDelete(a *Asset, role, callerID string) error {
	if a.Status != shared.StatusDraft {
		return &apperror.AppError{
			Code:    "UNPROCESSABLE_ENTITY",
			Message: "Apenas assets em draft podem ser deletados",
			Status:  422,
		}
	}
	if role == shared.RoleTech && a.CreatedBy != callerID {
		return apperror.NewForbidden("Você só pode deletar seus próprios assets")
	}
	return nil
}

func (assetMutationPolicy) ValidateSubmit(a *Asset, role, callerID string) error {
	// Permite re-submissão de assets rejeitados (TECH corrige e submete novamente).
	if a.Status != shared.StatusDraft && a.Status != shared.StatusRejected {
		return apperror.NewInvalidStatusTransition(a.Status, shared.StatusPending)
	}
	if role == shared.RoleTech && a.CreatedBy != callerID {
		return apperror.NewForbidden("Você só pode submeter seus próprios assets")
	}
	return nil
}

func (assetMutationPolicy) ValidateApprove(a *Asset, role string) error {
	if role != shared.RoleAdmin {
		return apperror.NewForbidden("Apenas admin pode aprovar assets")
	}
	if a.Status != shared.StatusPending {
		return apperror.NewInvalidStatusTransition(a.Status, shared.StatusApproved)
	}
	return nil
}

func (assetMutationPolicy) ValidateReject(a *Asset, role string) error {
	if role != shared.RoleAdmin {
		return apperror.NewForbidden("Apenas admin pode rejeitar assets")
	}
	if a.Status != shared.StatusPending {
		return apperror.NewInvalidStatusTransition(a.Status, shared.StatusRejected)
	}
	return nil
}

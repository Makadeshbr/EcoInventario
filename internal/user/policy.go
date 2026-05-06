package user

import (
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

type adminMutationPolicy struct{}

func (adminMutationPolicy) ValidateSelfUpdate(callerID string, target *User, req UpdateRequest) error {
	if target.ID != callerID {
		return nil
	}
	if req.IsActive != nil && !*req.IsActive {
		return apperror.NewForbidden("Nao e permitido desativar o proprio usuario admin")
	}
	if req.Role != nil && *req.Role != shared.RoleAdmin {
		return apperror.NewForbidden("Nao e permitido alterar a propria role admin")
	}
	return nil
}

func (adminMutationPolicy) ValidateSelfDelete(callerID string, target *User) error {
	if target.ID != callerID {
		return nil
	}
	return apperror.NewForbidden("Nao e permitido deletar o proprio usuario admin")
}

func (adminMutationPolicy) UpdateRequiresOtherActiveAdmin(target *User, req UpdateRequest) bool {
	if target.Role != shared.RoleAdmin || !target.IsActive {
		return false
	}

	nextRole := target.Role
	if req.Role != nil {
		nextRole = *req.Role
	}

	nextActive := target.IsActive
	if req.IsActive != nil {
		nextActive = *req.IsActive
	}

	return nextRole != shared.RoleAdmin || !nextActive
}

func (adminMutationPolicy) DeleteRequiresOtherActiveAdmin(target *User) bool {
	return target.Role == shared.RoleAdmin && target.IsActive
}

func (adminMutationPolicy) ValidateOrganizationKeepsAdmin(hasOtherActiveAdmin bool) error {
	if hasOtherActiveAdmin {
		return nil
	}
	return apperror.NewForbidden("A organizacao precisa manter pelo menos um admin ativo")
}

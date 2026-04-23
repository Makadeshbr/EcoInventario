package assettype

import "time"

// AssetType é o modelo de domínio de tipo de ativo.
type AssetType struct {
	ID             string
	OrganizationID string
	Name           string
	Description    *string
	IsActive       bool
	CreatedAt      time.Time
}

func (a *AssetType) toResponse() AssetTypeResponse {
	return AssetTypeResponse{
		ID:          a.ID,
		Name:        a.Name,
		Description: a.Description,
		IsActive:    a.IsActive,
	}
}

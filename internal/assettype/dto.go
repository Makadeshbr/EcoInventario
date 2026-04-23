package assettype

// CreateRequest é o payload de POST /api/v1/asset-types.
type CreateRequest struct {
	Name        string  `json:"name"        validate:"required,min=1,max=100"`
	Description *string `json:"description" validate:"omitempty,max=500"`
}

// UpdateRequest é o payload de PATCH /api/v1/asset-types/{id}.
type UpdateRequest struct {
	Name        *string `json:"name"        validate:"omitempty,min=1,max=100"`
	IsActive    *bool   `json:"is_active"`
}

// AssetTypeResponse é o shape público de um tipo de ativo.
type AssetTypeResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	IsActive    bool    `json:"is_active"`
}

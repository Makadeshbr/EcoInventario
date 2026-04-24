package manejo

import "time"

// CreateRequest é o payload de POST /api/v1/manejos.
type CreateRequest struct {
	AssetID       string  `json:"asset_id"        validate:"required,uuid"`
	Description   string  `json:"description"     validate:"required,min=1,max=5000"`
	BeforeMediaID *string `json:"before_media_id" validate:"omitempty,uuid"`
	AfterMediaID  *string `json:"after_media_id"  validate:"omitempty,uuid"`
}

// UpdateRequest é o payload de PATCH /api/v1/manejos/{id} (campos opcionais).
type UpdateRequest struct {
	Description   *string `json:"description"     validate:"omitempty,min=1,max=5000"`
	BeforeMediaID *string `json:"before_media_id" validate:"omitempty,uuid"`
	AfterMediaID  *string `json:"after_media_id"  validate:"omitempty,uuid"`
}

// RejectRequest é o payload de POST /api/v1/manejos/{id}/reject.
type RejectRequest struct {
	Reason string `json:"reason" validate:"required,min=1,max=1000"`
}

// ListFilters são os filtros para GET /api/v1/assets/{asset_id}/manejos.
type ListFilters struct {
	OrgID        string
	AssetID      string
	OnlyApproved bool
	Cursor       string
	Limit        int
}

// UserRef é uma referência enxuta a um usuário.
type UserRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Response é o shape público de um manejo.
type Response struct {
	ID              string    `json:"id"`
	AssetID         string    `json:"asset_id"`
	Description     string    `json:"description"`
	BeforeMediaID   *string   `json:"before_media_id,omitempty"`
	AfterMediaID    *string   `json:"after_media_id,omitempty"`
	Status          string    `json:"status"`
	RejectionReason *string   `json:"rejection_reason,omitempty"`
	CreatedBy       UserRef   `json:"created_by"`
	ApprovedBy      *UserRef  `json:"approved_by,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// StatusResponse é o shape de retorno das transições submit/approve.
type StatusResponse struct {
	ID         string  `json:"id"`
	Status     string  `json:"status"`
	ApprovedBy *string `json:"approved_by,omitempty"`
}

// RejectResponse é o shape de retorno do reject.
type RejectResponse struct {
	ID              string `json:"id"`
	Status          string `json:"status"`
	RejectionReason string `json:"rejection_reason"`
}

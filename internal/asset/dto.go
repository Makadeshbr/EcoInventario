package asset

import "time"

// CreateRequest é o payload de POST /api/v1/assets.
type CreateRequest struct {
	ID           *string  `json:"id"             validate:"omitempty,uuid"`
	AssetTypeID  string   `json:"asset_type_id"  validate:"required,uuid"`
	Latitude     float64  `json:"latitude"       validate:"gte=-90,lte=90"`
	Longitude    float64  `json:"longitude"      validate:"gte=-180,lte=180"`
	GPSAccuracyM *float32 `json:"gps_accuracy_m" validate:"omitempty,gte=0,lte=1000"`
	QRCode       string   `json:"qr_code"        validate:"required,min=1,max=500"`
	Notes        *string  `json:"notes"          validate:"omitempty,max=2000"`
}

// UpdateRequest é o payload de PATCH /api/v1/assets/{id} (campos opcionais).
type UpdateRequest struct {
	AssetTypeID  *string  `json:"asset_type_id"  validate:"omitempty,uuid"`
	Latitude     *float64 `json:"latitude"       validate:"omitempty,gte=-90,lte=90"`
	Longitude    *float64 `json:"longitude"      validate:"omitempty,gte=-180,lte=180"`
	GPSAccuracyM *float32 `json:"gps_accuracy_m" validate:"omitempty,gte=0,lte=1000"`
	Notes        *string  `json:"notes"          validate:"omitempty,max=2000"`
}

// RejectRequest é o payload de POST /api/v1/assets/{id}/reject.
type RejectRequest struct {
	Reason string `json:"reason" validate:"required,min=1,max=1000"`
}

// ListFilters são os filtros opcionais para GET /api/v1/assets.
// OrgID e OnlyApproved são preenchidos pelo service a partir do JWT (role + org).
type ListFilters struct {
	OrgID        string
	Status       string
	TypeID       string
	CreatedBy    string
	OnlyApproved bool
	Cursor       string
	Limit        int
}

// NearbyParams são os parâmetros para busca geográfica.
type NearbyParams struct {
	OrgID   string
	Lat     float64
	Lng     float64
	RadiusM int
	Limit   int
}

// TypeRef é uma referência enxuta a um asset_type (id + name).
type TypeRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// UserRef é uma referência enxuta a um usuário (id + name).
type UserRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Response é o shape público completo de um asset.
type Response struct {
	ID              string    `json:"id"`
	AssetType       TypeRef   `json:"asset_type"`
	Latitude        float64   `json:"latitude"`
	Longitude       float64   `json:"longitude"`
	GPSAccuracyM    *float32  `json:"gps_accuracy_m,omitempty"`
	QRCode          string    `json:"qr_code"`
	Status          string    `json:"status"`
	Version         int       `json:"version"`
	ParentID        *string   `json:"parent_id,omitempty"`
	RejectionReason *string   `json:"rejection_reason,omitempty"`
	Notes           *string   `json:"notes,omitempty"`
	CreatedBy       UserRef   `json:"created_by"`
	ApprovedBy      *UserRef  `json:"approved_by,omitempty"`
	DistanceM       *float64  `json:"distance_m,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// HistoryEntry representa uma versão na cadeia de versões de um asset.
type HistoryEntry struct {
	ID        string    `json:"id"`
	Version   int       `json:"version"`
	Status    string    `json:"status"`
	ParentID  *string   `json:"parent_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// StatusResponse é o shape de retorno das transições submit/approve.
type StatusResponse struct {
	ID         string  `json:"id"`
	Status     string  `json:"status"`
	ApprovedBy *string `json:"approved_by,omitempty"`
}

// RejectResponse é o shape de retorno do reject, incluindo o motivo.
type RejectResponse struct {
	ID              string `json:"id"`
	Status          string `json:"status"`
	RejectionReason string `json:"rejection_reason"`
}

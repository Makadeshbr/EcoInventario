package media

import "time"

// UploadURLRequest é o payload de POST /api/v1/media/upload-url.
type UploadURLRequest struct {
	MediaID        *string `json:"media_id"        validate:"omitempty"`
	AssetID        string  `json:"asset_id"        validate:"required,uuid"`
	MediaType      string  `json:"media_type"      validate:"required"`
	MimeType       string  `json:"mime_type"       validate:"required"`
	SizeBytes      int64   `json:"size_bytes"      validate:"omitempty"`
	IdempotencyKey string  `json:"idempotency_key" validate:"required"`
}

// UploadURLResponse é a resposta de POST /api/v1/media/upload-url.
type UploadURLResponse struct {
	MediaID    string `json:"media_id"`
	UploadURL  string `json:"upload_url"`
	StorageKey string `json:"storage_key"`
	ExpiresIn  int    `json:"expires_in"` // segundos
}

// ConfirmResponse é a resposta de POST /api/v1/media/{id}/confirm.
type ConfirmResponse struct {
	MediaID      string `json:"media_id"`
	UploadStatus string `json:"upload_status"`
}

// GetResponse é a resposta de GET /api/v1/media/{id}.
type GetResponse struct {
	ID           string    `json:"id"`
	AssetID      string    `json:"asset_id"`
	Type         string    `json:"type"`
	MimeType     string    `json:"mime_type"`
	SizeBytes    int64     `json:"size_bytes"`
	UploadStatus string    `json:"upload_status"`
	URL          string    `json:"url"`
	CreatedAt    time.Time `json:"created_at"`
}

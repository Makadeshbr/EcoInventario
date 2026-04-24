package public

import "time"

// TypeRef é uma referência mínima a um tipo de ativo.
type TypeRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// AssetSummary é a representação de um asset no mapa público (lista).
type AssetSummary struct {
	ID           string   `json:"id"`
	AssetType    TypeRef  `json:"asset_type"`
	Latitude     float64  `json:"latitude"`
	Longitude    float64  `json:"longitude"`
	QRCode       string   `json:"qr_code"`
	ThumbnailURL *string  `json:"thumbnail_url"`
}

// MediaPublic é a mídia com URL presigned.
type MediaPublic struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	URL  string `json:"url"`
}

// ManejoPublic é a representação pública de um manejo aprovado.
type ManejoPublic struct {
	ID             string    `json:"id"`
	Description    string    `json:"description"`
	BeforeMediaURL *string   `json:"before_media_url"`
	AfterMediaURL  *string   `json:"after_media_url"`
	CreatedAt      time.Time `json:"created_at"`
}

// MonitoramentoPublic é a representação pública de um monitoramento aprovado.
type MonitoramentoPublic struct {
	ID           string    `json:"id"`
	Notes        string    `json:"notes"`
	HealthStatus string    `json:"health_status"`
	CreatedAt    time.Time `json:"created_at"`
}

// AssetDetail é a ficha completa de um asset aprovado.
// Campos sensíveis (created_by, approved_by, notes, status, gps_accuracy, version) são omitidos.
type AssetDetail struct {
	ID               string                `json:"id"`
	AssetType        TypeRef               `json:"asset_type"`
	Latitude         float64               `json:"latitude"`
	Longitude        float64               `json:"longitude"`
	QRCode           string                `json:"qr_code"`
	OrganizationName string                `json:"organization_name"`
	Media            []MediaPublic         `json:"media"`
	Manejos          []ManejoPublic        `json:"manejos"`
	Monitoramentos   []MonitoramentoPublic `json:"monitoramentos"`
	CreatedAt        time.Time             `json:"created_at"`
}

// QRResolveResponse é a resposta do resolve-qr.
type QRResolveResponse struct {
	AssetID     *string `json:"asset_id"`
	IsAvailable bool    `json:"is_available"`
}

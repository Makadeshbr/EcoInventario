package public

import "time"

// BoundsParams são os parâmetros para a busca por bounding box.
type BoundsParams struct {
	SWLat, SWLng float64
	NELat, NELng float64
	TypeID       string
	Limit        int
}

// AssetTypeItem é a representação pública de um tipo de ativo.
type AssetTypeItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// AssetSummaryRow é o row retornado pelo repositório para listagem de assets no mapa.
type AssetSummaryRow struct {
	ID              string
	AssetTypeID     string
	TypeName        string
	Latitude        float64
	Longitude       float64
	QRCode          string
	ThumbnailKey    *string
	ThumbnailBucket *string
}

// AssetDetailRow é o row do detalhe completo de um asset.
type AssetDetailRow struct {
	ID               string
	AssetTypeID      string
	TypeName         string
	Latitude         float64
	Longitude        float64
	QRCode           string
	OrganizationName string
	CreatedAt        time.Time
}

// MediaRow representa uma mídia carregada de um asset.
type MediaRow struct {
	ID            string
	StorageKey    string
	StorageBucket string
	Type          string
}

// ManejoRow representa um manejo aprovado com referências de mídia.
type ManejoRow struct {
	ID               string
	Description      string
	BeforeStorageKey *string
	BeforeBucket     *string
	AfterStorageKey  *string
	AfterBucket      *string
	CreatedAt        time.Time
}

// MonitoramentoRow representa um monitoramento aprovado.
type MonitoramentoRow struct {
	ID           string
	Notes        string
	HealthStatus string
	CreatedAt    time.Time
}

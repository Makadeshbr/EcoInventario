package media

import "time"

// Media é o modelo de domínio para arquivos de mídia vinculados a assets.
type Media struct {
	ID             string
	OrganizationID string
	AssetID        string
	StorageKey     string
	StorageBucket  string
	MimeType       string
	SizeBytes      int64
	Type           string // before | after | general
	UploadStatus   string // pending | uploaded | failed
	IdempotencyKey string
	CreatedBy      string
	CreatedAt      time.Time
}

// Constantes de tipo de mídia.
const (
	TypeBefore  = "before"
	TypeAfter   = "after"
	TypeGeneral = "general"
)

// Constantes de status de upload.
const (
	UploadStatusPending  = "pending"
	UploadStatusUploaded = "uploaded"
	UploadStatusFailed   = "failed"
)

// MaxSizeBytes é o tamanho máximo permitido por arquivo (10 MB).
const MaxSizeBytes = 10_485_760

// MaxPerAsset é o número máximo de mídias por asset.
const MaxPerAsset = 20

// mimeExtensions mapeia MIME types permitidos para a extensão de arquivo correspondente.
var mimeExtensions = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/webp": "webp",
}

// IsAllowedMIME verifica se o MIME type é um dos tipos aceitos pelo sistema.
func IsAllowedMIME(mime string) bool {
	_, ok := mimeExtensions[mime]
	return ok
}

// ExtensionFor retorna a extensão de arquivo para o MIME type dado.
// Retorna string vazia se o tipo não for reconhecido.
func ExtensionFor(mime string) string {
	return mimeExtensions[mime]
}

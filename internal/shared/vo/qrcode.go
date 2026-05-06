package vo

import (
	"strings"

	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// QRCode encapsula um código QR não-vazio com até 500 caracteres.
type QRCode struct {
	value string
}

func NewQRCode(s string) (QRCode, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return QRCode{}, apperror.NewValidation("qr_code não pode ser vazio")
	}
	if len(s) > 500 {
		return QRCode{}, apperror.NewValidation("qr_code deve ter no máximo 500 caracteres")
	}
	return QRCode{value: s}, nil
}

func (q QRCode) String() string { return q.value }

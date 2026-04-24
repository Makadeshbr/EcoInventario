package asset

import "time"

// Asset é o modelo de domínio de um ativo georreferenciado.
// Lat/Lng são armazenados como GEOGRAPHY(POINT) no banco, mas transitam em floats
// dentro da aplicação. O repositório converte via ST_MakePoint/ST_Y/ST_X.
type Asset struct {
	ID              string
	OrganizationID  string
	AssetTypeID     string
	Latitude        float64
	Longitude       float64
	GPSAccuracyM    *float32
	QRCode          string
	Status          string
	Version         int
	ParentID        *string
	RejectionReason *string
	Notes           *string
	CreatedBy       string
	ApprovedBy      *string
	CreatedAt       time.Time
	UpdatedAt       time.Time

	// Campos populados via join — usados para response, não persistidos diretamente.
	AssetTypeName  string
	CreatedByName  string
	ApprovedByName *string
	DistanceM      *float64
}

func (a *Asset) toResponse() Response {
	resp := Response{
		ID: a.ID,
		AssetType: TypeRef{
			ID:   a.AssetTypeID,
			Name: a.AssetTypeName,
		},
		Latitude:        a.Latitude,
		Longitude:       a.Longitude,
		GPSAccuracyM:    a.GPSAccuracyM,
		QRCode:          a.QRCode,
		Status:          a.Status,
		Version:         a.Version,
		ParentID:        a.ParentID,
		RejectionReason: a.RejectionReason,
		Notes:           a.Notes,
		CreatedBy: UserRef{
			ID:   a.CreatedBy,
			Name: a.CreatedByName,
		},
		DistanceM: a.DistanceM,
		CreatedAt: a.CreatedAt,
		UpdatedAt: a.UpdatedAt,
	}
	if a.ApprovedBy != nil {
		name := ""
		if a.ApprovedByName != nil {
			name = *a.ApprovedByName
		}
		resp.ApprovedBy = &UserRef{ID: *a.ApprovedBy, Name: name}
	}
	return resp
}

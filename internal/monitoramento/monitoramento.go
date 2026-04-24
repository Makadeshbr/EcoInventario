package monitoramento

import "time"

// Monitoramento é o modelo de domínio de um registro de monitoramento de ativo.
type Monitoramento struct {
	ID              string
	OrganizationID  string
	AssetID         string
	Notes           string
	HealthStatus    string
	Status          string
	RejectionReason *string
	CreatedBy       string
	ApprovedBy      *string
	CreatedAt       time.Time
	UpdatedAt       time.Time

	// Populados via join — não persistidos diretamente.
	CreatedByName  string
	ApprovedByName *string
}

func (m *Monitoramento) toResponse() Response {
	resp := Response{
		ID:              m.ID,
		AssetID:         m.AssetID,
		Notes:           m.Notes,
		HealthStatus:    m.HealthStatus,
		Status:          m.Status,
		RejectionReason: m.RejectionReason,
		CreatedBy: UserRef{
			ID:   m.CreatedBy,
			Name: m.CreatedByName,
		},
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
	if m.ApprovedBy != nil {
		name := ""
		if m.ApprovedByName != nil {
			name = *m.ApprovedByName
		}
		resp.ApprovedBy = &UserRef{ID: *m.ApprovedBy, Name: name}
	}
	return resp
}

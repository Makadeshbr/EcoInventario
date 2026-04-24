package manejo

import "time"

// Manejo é o modelo de domínio de um registro de manejo de ativo.
type Manejo struct {
	ID              string
	OrganizationID  string
	AssetID         string
	Description     string
	BeforeMediaID   *string
	AfterMediaID    *string
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

func (m *Manejo) toResponse() Response {
	resp := Response{
		ID:              m.ID,
		AssetID:         m.AssetID,
		Description:     m.Description,
		BeforeMediaID:   m.BeforeMediaID,
		AfterMediaID:    m.AfterMediaID,
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

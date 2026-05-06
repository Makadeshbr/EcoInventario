package asset

import (
	"context"
	"fmt"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/shared/vo"
)

// Create cria um novo asset com status=draft, version=1.
// QR code é fornecido pelo cliente e deve ser único globalmente.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*Response, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	if err := s.ensureTypeInOrg(ctx, req.AssetTypeID, orgID); err != nil {
		return nil, err
	}

	if _, err := vo.NewCoordinates(req.Latitude, req.Longitude); err != nil {
		return nil, err
	}
	if _, err := vo.NewQRCode(req.QRCode); err != nil {
		return nil, err
	}

	existing, err := s.repo.FindByQRCode(ctx, req.QRCode)
	if err != nil {
		return nil, fmt.Errorf("verificando qr_code: %w", err)
	}
	if existing != nil {
		return nil, apperror.NewConflict("QR code já está em uso")
	}

	a := &Asset{
		OrganizationID: orgID,
		AssetTypeID:    req.AssetTypeID,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		GPSAccuracyM:   req.GPSAccuracyM,
		QRCode:         req.QRCode,
		Status:         shared.StatusDraft,
		Version:        1,
		Notes:          req.Notes,
		CreatedBy:      callerID,
	}
	if req.ID != nil {
		a.ID = *req.ID
	}
	if err := s.repo.Insert(ctx, a); err != nil {
		return nil, fmt.Errorf("inserindo asset: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset",
		EntityID:       a.ID,
		Action:         shared.AuditCreate,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"qr_code": a.QRCode, "status": a.Status}),
	})

	// Rebusca para popular joins (asset_type name, created_by name).
	full, err := s.repo.FindByID(ctx, a.ID, orgID)
	if err != nil || full == nil {
		resp := a.toResponse()
		return &resp, nil
	}
	resp := full.toResponse()
	return &resp, nil
}

// Update aplica correções a um asset. Regras:
//   - status=draft ou rejected → edição in-place (TECH deve ser dono; ADMIN qualquer).
//   - status=approved → cria nova versão (parent_id + version+1, status=draft). Apenas ADMIN.
//   - status=pending → 409 INVALID_STATUS_TRANSITION (edição bloqueada).
//
// Retorna o Response atualizado e um flag `created` para o handler saber se deve responder 201.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*Response, bool, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	current, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, false, fmt.Errorf("buscando asset: %w", err)
	}
	if current == nil {
		return nil, false, apperror.NewNotFound("asset", id)
	}

	mode, err := s.policy.ValidateUpdate(current, role, callerID)
	if err != nil {
		return nil, false, err
	}

	switch mode {
	case assetUpdateNewVersion:
		resp, err := s.createNewVersion(ctx, current, req, callerID, orgID)
		if err != nil {
			return nil, false, err
		}
		return resp, true, nil
	case assetUpdateInPlace:
		if req.AssetTypeID != nil {
			if err := s.ensureTypeInOrg(ctx, *req.AssetTypeID, orgID); err != nil {
				return nil, false, err
			}
		}
		resp, err := s.applyInPlaceUpdate(ctx, current, req, callerID, orgID)
		if err != nil {
			return nil, false, err
		}
		return resp, false, nil
	default:
		return nil, false, apperror.NewInvalidStatusTransition(current.Status, "editing")
	}
}

func (s *Service) applyInPlaceUpdate(ctx context.Context, current *Asset, req UpdateRequest, callerID, orgID string) (*Response, error) {
	changes := map[string]any{}

	if req.AssetTypeID != nil && *req.AssetTypeID != current.AssetTypeID {
		changes["asset_type_id"] = map[string]string{"old": current.AssetTypeID, "new": *req.AssetTypeID}
		current.AssetTypeID = *req.AssetTypeID
	}
	if req.Latitude != nil && *req.Latitude != current.Latitude {
		changes["latitude"] = map[string]any{"old": current.Latitude, "new": *req.Latitude}
		current.Latitude = *req.Latitude
	}
	if req.Longitude != nil && *req.Longitude != current.Longitude {
		changes["longitude"] = map[string]any{"old": current.Longitude, "new": *req.Longitude}
		current.Longitude = *req.Longitude
	}
	if req.GPSAccuracyM != nil {
		changes["gps_accuracy_m"] = *req.GPSAccuracyM
		current.GPSAccuracyM = req.GPSAccuracyM
	}
	if req.Notes != nil {
		changes["notes"] = *req.Notes
		current.Notes = req.Notes
	}

	if err := s.repo.Update(ctx, current); err != nil {
		return nil, fmt.Errorf("atualizando asset: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset",
		EntityID:       current.ID,
		Action:         shared.AuditUpdate,
		PerformedBy:    callerID,
		Changes:        mustMarshal(changes),
	})

	full, err := s.repo.FindByID(ctx, current.ID, orgID)
	if err != nil || full == nil {
		resp := current.toResponse()
		return &resp, nil
	}
	resp := full.toResponse()
	return &resp, nil
}

func (s *Service) createNewVersion(ctx context.Context, parent *Asset, req UpdateRequest, callerID, orgID string) (*Response, error) {
	if req.AssetTypeID != nil {
		if err := s.ensureTypeInOrg(ctx, *req.AssetTypeID, orgID); err != nil {
			return nil, err
		}
	}

	// QR code é estável através das versões — identifica o ativo físico, não o registro.
	// Unicidade é garantida pelo índice parcial em (qr_code) WHERE parent_id IS NULL AND deleted_at IS NULL
	// (migration 000013). Versões descendentes compartilham o qr_code da raiz.
	next := &Asset{
		OrganizationID: orgID,
		AssetTypeID:    parent.AssetTypeID,
		Latitude:       parent.Latitude,
		Longitude:      parent.Longitude,
		GPSAccuracyM:   parent.GPSAccuracyM,
		QRCode:         parent.QRCode,
		Status:         shared.StatusDraft,
		Version:        parent.Version + 1,
		ParentID:       &parent.ID,
		Notes:          parent.Notes,
		CreatedBy:      callerID,
	}

	changes := map[string]any{"parent_id": parent.ID, "version": next.Version}
	if req.AssetTypeID != nil {
		next.AssetTypeID = *req.AssetTypeID
		changes["asset_type_id"] = *req.AssetTypeID
	}
	if req.Latitude != nil {
		next.Latitude = *req.Latitude
		changes["latitude"] = *req.Latitude
	}
	if req.Longitude != nil {
		next.Longitude = *req.Longitude
		changes["longitude"] = *req.Longitude
	}
	if req.GPSAccuracyM != nil {
		next.GPSAccuracyM = req.GPSAccuracyM
		changes["gps_accuracy_m"] = *req.GPSAccuracyM
	}
	if req.Notes != nil {
		next.Notes = req.Notes
		changes["notes"] = *req.Notes
	}

	if err := s.repo.Insert(ctx, next); err != nil {
		return nil, fmt.Errorf("criando nova versão: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset",
		EntityID:       next.ID,
		Action:         shared.AuditCreate,
		PerformedBy:    callerID,
		Changes:        mustMarshal(changes),
	})

	full, err := s.repo.FindByID(ctx, next.ID, orgID)
	if err != nil || full == nil {
		resp := next.toResponse()
		return &resp, nil
	}
	resp := full.toResponse()
	return &resp, nil
}

// SoftDelete marca um asset como deletado. Apenas status=draft.
// TECH só pode deletar os próprios; ADMIN pode deletar qualquer um da org.
func (s *Service) SoftDelete(ctx context.Context, id string) error {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return apperror.NewNotFound("asset", id)
	}
	if err := s.policy.ValidateSoftDelete(a, role, callerID); err != nil {
		return err
	}

	if err := s.repo.SoftDelete(ctx, id, orgID); err != nil {
		return fmt.Errorf("deletando asset: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset",
		EntityID:       id,
		Action:         shared.AuditDelete,
		PerformedBy:    callerID,
	})
	return nil
}

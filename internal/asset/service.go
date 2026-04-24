package asset

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/allan/ecoinventario/internal/shared/response"
)

// AssetTypeChecker é a interface estreita exigida do pacote assettype.
// Evita import cíclico e mantém este package com o mínimo de dependências.
type AssetTypeChecker interface {
	ExistsInOrg(ctx context.Context, id, orgID string) (bool, error)
}

// MediaChecker verifica se um asset possui pelo menos uma mídia com upload
// concluído — pré-requisito para submit (API_CONTRACTS §6).
// T04 injeta implementação no-op; T05 (Media) substitui pela real.
type MediaChecker interface {
	HasUploadedMedia(ctx context.Context, assetID string) (bool, error)
}

// Service implementa a lógica de negócio para assets.
type Service struct {
	repo     Repository
	typeRepo AssetTypeChecker
	media    MediaChecker
	audit    *audit.Service
}

// NewService cria o serviço de assets.
func NewService(repo Repository, typeRepo AssetTypeChecker, media MediaChecker, auditSvc *audit.Service) *Service {
	return &Service{repo: repo, typeRepo: typeRepo, media: media, audit: auditSvc}
}

// Create cria um novo asset com status=draft, version=1.
// QR code é fornecido pelo cliente e deve ser único globalmente.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*Response, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	if err := s.ensureTypeInOrg(ctx, req.AssetTypeID, orgID); err != nil {
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
		// Fallback: retorna com nomes vazios. Não é ideal, mas o asset existe.
		resp := a.toResponse()
		return &resp, nil
	}
	resp := full.toResponse()
	return &resp, nil
}

// GetByID retorna um asset com referências populadas.
// Viewer só enxerga assets com status=approved.
func (s *Service) GetByID(ctx context.Context, id string) (*Response, error) {
	orgID := shared.GetOrgID(ctx)
	role := shared.GetRole(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return nil, apperror.NewNotFound("asset", id)
	}
	if role == shared.RoleViewer && a.Status != shared.StatusApproved {
		return nil, apperror.NewNotFound("asset", id)
	}

	resp := a.toResponse()
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

	switch current.Status {
	case shared.StatusPending:
		return nil, false, apperror.NewInvalidStatusTransition(current.Status, "editing")
	case shared.StatusApproved:
		if role != shared.RoleAdmin {
			return nil, false, apperror.NewForbidden("Apenas admin pode editar asset aprovado")
		}
		resp, err := s.createNewVersion(ctx, current, req, callerID, orgID)
		if err != nil {
			return nil, false, err
		}
		return resp, true, nil
	case shared.StatusDraft, shared.StatusRejected:
		if role == shared.RoleTech && current.CreatedBy != callerID {
			return nil, false, apperror.NewForbidden("Você só pode editar seus próprios assets")
		}
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
	if a.Status != shared.StatusDraft {
		return &apperror.AppError{
			Code:    "UNPROCESSABLE_ENTITY",
			Message: "Apenas assets em draft podem ser deletados",
			Status:  422,
		}
	}
	if role == shared.RoleTech && a.CreatedBy != callerID {
		return apperror.NewForbidden("Você só pode deletar seus próprios assets")
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

// Submit transiciona draft→pending. TECH dono ou ADMIN.
func (s *Service) Submit(ctx context.Context, id string) (*StatusResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)
	role := shared.GetRole(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return nil, apperror.NewNotFound("asset", id)
	}
	if a.Status != shared.StatusDraft {
		return nil, apperror.NewInvalidStatusTransition(a.Status, shared.StatusPending)
	}
	if role == shared.RoleTech && a.CreatedBy != callerID {
		return nil, apperror.NewForbidden("Você só pode submeter seus próprios assets")
	}

	hasMedia, err := s.media.HasUploadedMedia(ctx, a.ID)
	if err != nil {
		return nil, fmt.Errorf("verificando mídia: %w", err)
	}
	if !hasMedia {
		return nil, &apperror.AppError{
			Code:    "UNPROCESSABLE_ENTITY",
			Message: "Submit exige ao menos uma mídia carregada",
			Status:  422,
		}
	}

	a.Status = shared.StatusPending
	if err := s.repo.UpdateStatus(ctx, a); err != nil {
		return nil, fmt.Errorf("atualizando status: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset",
		EntityID:       a.ID,
		Action:         shared.AuditSubmit,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": map[string]string{"old": shared.StatusDraft, "new": shared.StatusPending}}),
	})

	return &StatusResponse{ID: a.ID, Status: a.Status}, nil
}

// Approve transiciona pending→approved. ADMIN only. Preenche approved_by.
func (s *Service) Approve(ctx context.Context, id string) (*StatusResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return nil, apperror.NewNotFound("asset", id)
	}
	if a.Status != shared.StatusPending {
		return nil, apperror.NewInvalidStatusTransition(a.Status, shared.StatusApproved)
	}

	approver := callerID
	a.Status = shared.StatusApproved
	a.ApprovedBy = &approver
	if err := s.repo.UpdateStatus(ctx, a); err != nil {
		return nil, fmt.Errorf("atualizando status: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset",
		EntityID:       a.ID,
		Action:         shared.AuditApprove,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": map[string]string{"old": shared.StatusPending, "new": shared.StatusApproved}}),
	})

	return &StatusResponse{ID: a.ID, Status: a.Status, ApprovedBy: &approver}, nil
}

// Reject transiciona pending→rejected. ADMIN only. Requer motivo.
func (s *Service) Reject(ctx context.Context, id string, req RejectRequest) (*RejectResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return nil, apperror.NewNotFound("asset", id)
	}
	if a.Status != shared.StatusPending {
		return nil, apperror.NewInvalidStatusTransition(a.Status, shared.StatusRejected)
	}

	reason := req.Reason
	a.Status = shared.StatusRejected
	a.RejectionReason = &reason
	if err := s.repo.UpdateStatus(ctx, a); err != nil {
		return nil, fmt.Errorf("atualizando status: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "asset",
		EntityID:       a.ID,
		Action:         shared.AuditReject,
		PerformedBy:    callerID,
		Changes:        mustMarshal(map[string]any{"status": map[string]string{"old": shared.StatusPending, "new": shared.StatusRejected}, "reason": reason}),
	})

	return &RejectResponse{ID: a.ID, Status: a.Status, RejectionReason: reason}, nil
}

// List lista assets da organização com filtros e paginação por cursor.
// Viewer enxerga apenas approved — ignora filtro de status recebido.
func (s *Service) List(ctx context.Context, f ListFilters) (response.Paginated[Response], error) {
	orgID := shared.GetOrgID(ctx)
	role := shared.GetRole(ctx)
	f.OrgID = orgID
	f.OnlyApproved = role == shared.RoleViewer

	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 20
	}

	f.Limit++
	assets, err := s.repo.List(ctx, f)
	if err != nil {
		return response.Paginated[Response]{}, fmt.Errorf("listando assets: %w", err)
	}
	f.Limit--

	resps := make([]Response, len(assets))
	for i, a := range assets {
		resps[i] = a.toResponse()
	}

	return response.NewPaginated(resps, f.Limit, func(r Response) string { return r.ID }), nil
}

// Nearby busca assets approved dentro de um raio em metros, ordenados por distância.
func (s *Service) Nearby(ctx context.Context, p NearbyParams) ([]Response, error) {
	orgID := shared.GetOrgID(ctx)
	p.OrgID = orgID

	if p.Limit <= 0 || p.Limit > 100 {
		p.Limit = 20
	}
	if p.RadiusM <= 0 {
		p.RadiusM = 5000
	}
	if p.RadiusM > 50000 {
		p.RadiusM = 50000
	}

	assets, err := s.repo.Nearby(ctx, p)
	if err != nil {
		return nil, fmt.Errorf("nearby: %w", err)
	}

	resps := make([]Response, len(assets))
	for i, a := range assets {
		resps[i] = a.toResponse()
	}
	return resps, nil
}

// History retorna a cadeia completa de versões do asset.
// Verifica acesso: viewer não tem acesso se o asset base não é approved.
func (s *Service) History(ctx context.Context, id string) ([]HistoryEntry, error) {
	orgID := shared.GetOrgID(ctx)
	role := shared.GetRole(ctx)

	a, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if a == nil {
		return nil, apperror.NewNotFound("asset", id)
	}
	if role == shared.RoleViewer && a.Status != shared.StatusApproved {
		return nil, apperror.NewNotFound("asset", id)
	}

	return s.repo.History(ctx, id, orgID)
}

func (s *Service) ensureTypeInOrg(ctx context.Context, typeID, orgID string) error {
	ok, err := s.typeRepo.ExistsInOrg(ctx, typeID, orgID)
	if err != nil {
		return fmt.Errorf("verificando asset_type: %w", err)
	}
	if !ok {
		return apperror.NewValidation("asset_type_id não existe na organização")
	}
	return nil
}

func mustMarshal(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

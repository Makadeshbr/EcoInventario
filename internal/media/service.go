package media

import (
	"context"
	"fmt"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/google/uuid"
)

// AssetChecker verifica se um asset existe na organização.
// Interface estreita para evitar import cíclico com o pacote asset.
type AssetChecker interface {
	ExistsInOrg(ctx context.Context, id, orgID string) (bool, error)
}

// Service implementa a lógica de negócio para media.
type Service struct {
	repo      Repository
	s3        S3Client
	assetRepo AssetChecker
	audit     *audit.Service
	bucket    string
}

// NewService cria o serviço de media.
func NewService(repo Repository, s3 S3Client, assetRepo AssetChecker, auditSvc *audit.Service, bucket string) *Service {
	return &Service{
		repo:      repo,
		s3:        s3,
		assetRepo: assetRepo,
		audit:     auditSvc,
		bucket:    bucket,
	}
}

// GenerateUploadURL cria um registro de media e retorna uma presigned PUT URL (15min).
// Idempotente: se a idempotency_key já foi usada, retorna nova URL para a mesma media.
func (s *Service) GenerateUploadURL(ctx context.Context, req UploadURLRequest) (*UploadURLResponse, error) {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	if !IsAllowedMIME(req.MimeType) {
		return nil, apperror.NewValidation("mime_type inválido: apenas image/jpeg, image/png, image/webp são aceitos")
	}

	exists, err := s.assetRepo.ExistsInOrg(ctx, req.AssetID, orgID)
	if err != nil {
		return nil, fmt.Errorf("verificando asset: %w", err)
	}
	if !exists {
		return nil, apperror.NewNotFound("asset", req.AssetID)
	}

	// Idempotência: se a key já foi usada, gera nova URL para a mesma media.
	existing, err := s.repo.FindByIdempotencyKey(ctx, req.IdempotencyKey)
	if err != nil {
		return nil, fmt.Errorf("verificando idempotência: %w", err)
	}
	if existing != nil {
		// Gera nova presigned URL — a original pode ter expirado.
		uploadURL, err := s.s3.GeneratePresignedPutURL(ctx, existing.StorageBucket, existing.StorageKey)
		if err != nil {
			return nil, err
		}
		return &UploadURLResponse{
			MediaID:   existing.ID,
			UploadURL: uploadURL,
			ExpiresIn: int(PresignedPutExpiry.Seconds()),
		}, nil
	}

	// Verifica limite de 20 fotos por asset (conta apenas uploaded para não bloquear uploads em curso).
	count, err := s.repo.CountUploadedByAsset(ctx, req.AssetID)
	if err != nil {
		return nil, fmt.Errorf("contando media: %w", err)
	}
	if count >= MaxPerAsset {
		return nil, &apperror.AppError{
			Code:    "UNPROCESSABLE_ENTITY",
			Message: fmt.Sprintf("O asset já possui %d mídias enviadas (máximo permitido)", MaxPerAsset),
			Status:  422,
		}
	}

	// Monta storage key: {org_id}/assets/{asset_id}/{media_id}.{ext}
	mediaID := uuid.NewString()
	ext := ExtensionFor(req.MimeType)
	storageKey := fmt.Sprintf("%s/assets/%s/%s.%s", orgID, req.AssetID, mediaID, ext)

	m := &Media{
		ID:             mediaID,
		OrganizationID: orgID,
		AssetID:        req.AssetID,
		StorageKey:     storageKey,
		StorageBucket:  s.bucket,
		MimeType:       req.MimeType,
		SizeBytes:      req.SizeBytes,
		Type:           req.MediaType,
		UploadStatus:   UploadStatusPending,
		IdempotencyKey: req.IdempotencyKey,
		CreatedBy:      callerID,
	}
	if err := s.repo.Insert(ctx, m); err != nil {
		return nil, fmt.Errorf("inserindo media: %w", err)
	}

	uploadURL, err := s.s3.GeneratePresignedPutURL(ctx, s.bucket, storageKey)
	if err != nil {
		return nil, err
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "media",
		EntityID:       m.ID,
		Action:         shared.AuditUpload,
		PerformedBy:    callerID,
	})

	return &UploadURLResponse{
		MediaID:   m.ID,
		UploadURL: uploadURL,
		ExpiresIn: int(PresignedPutExpiry.Seconds()),
	}, nil
}

// Confirm verifica que o objeto existe no S3 e marca o upload como concluído.
func (s *Service) Confirm(ctx context.Context, id string) (*ConfirmResponse, error) {
	orgID := shared.GetOrgID(ctx)

	m, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando media: %w", err)
	}
	if m == nil {
		return nil, apperror.NewNotFound("media", id)
	}
	if m.UploadStatus == UploadStatusUploaded {
		// Já confirmado — idempotente.
		return &ConfirmResponse{MediaID: m.ID, UploadStatus: m.UploadStatus}, nil
	}

	// Verifica que o objeto realmente existe no S3 antes de confirmar.
	exists, err := s.s3.ObjectExists(ctx, m.StorageBucket, m.StorageKey)
	if err != nil {
		return nil, fmt.Errorf("verificando objeto no S3: %w", err)
	}
	if !exists {
		return nil, &apperror.AppError{
			Code:    "UNPROCESSABLE_ENTITY",
			Message: "Arquivo ainda não encontrado no storage. Faça o upload antes de confirmar.",
			Status:  422,
		}
	}

	m.UploadStatus = UploadStatusUploaded
	if err := s.repo.Update(ctx, m); err != nil {
		return nil, fmt.Errorf("atualizando status de upload: %w", err)
	}

	return &ConfirmResponse{MediaID: m.ID, UploadStatus: m.UploadStatus}, nil
}

// GetByID retorna a media com uma presigned GET URL gerada sob demanda (1h).
func (s *Service) GetByID(ctx context.Context, id string) (*GetResponse, error) {
	orgID := shared.GetOrgID(ctx)

	m, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, fmt.Errorf("buscando media: %w", err)
	}
	if m == nil {
		return nil, apperror.NewNotFound("media", id)
	}

	// URL gerada sob demanda — nunca armazenada.
	url, err := s.s3.GeneratePresignedGetURL(ctx, m.StorageBucket, m.StorageKey)
	if err != nil {
		return nil, fmt.Errorf("gerando URL de acesso: %w", err)
	}

	return &GetResponse{
		ID:           m.ID,
		AssetID:      m.AssetID,
		Type:         m.Type,
		MimeType:     m.MimeType,
		SizeBytes:    m.SizeBytes,
		UploadStatus: m.UploadStatus,
		URL:          url,
		CreatedAt:    m.CreatedAt,
	}, nil
}

// SoftDelete marca a media como deletada e registra no audit log.
func (s *Service) SoftDelete(ctx context.Context, id string) error {
	orgID := shared.GetOrgID(ctx)
	callerID := shared.GetUserID(ctx)

	m, err := s.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return fmt.Errorf("buscando media: %w", err)
	}
	if m == nil {
		return apperror.NewNotFound("media", id)
	}

	if err := s.repo.SoftDelete(ctx, id, orgID); err != nil {
		return fmt.Errorf("deletando media: %w", err)
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: orgID,
		EntityType:     "media",
		EntityID:       id,
		Action:         shared.AuditDelete,
		PerformedBy:    callerID,
	})
	return nil
}

// HasUploadedMedia satisfaz a interface asset.MediaChecker.
// Retorna true se o asset possui ao menos uma mídia com upload concluído.
func (s *Service) HasUploadedMedia(ctx context.Context, assetID string) (bool, error) {
	return s.repo.HasUploaded(ctx, assetID)
}

package public

import (
	"context"
	"fmt"

	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// URLSigner gera URLs presigned de download para mídias no storage.
type URLSigner interface {
	GeneratePresignedGetURL(ctx context.Context, bucket, key string) (string, error)
}

// Service implementa a lógica de negócio da API pública.
type Service struct {
	repo          Repository
	signer        URLSigner
	defaultBucket string
}

// NewService cria o serviço público.
func NewService(repo Repository, signer URLSigner, defaultBucket string) *Service {
	return &Service{repo: repo, signer: signer, defaultBucket: defaultBucket}
}

// ListAssetTypes retorna todos os tipos de ativo ativos.
func (s *Service) ListAssetTypes(ctx context.Context) ([]AssetTypeItem, error) {
	return s.repo.ListAssetTypes(ctx)
}

// ListAssets retorna assets aprovados dentro do bounding box com thumbnail.
func (s *Service) ListAssets(ctx context.Context, p BoundsParams) ([]AssetSummary, error) {
	rows, err := s.repo.ListAssetsByBounds(ctx, p)
	if err != nil {
		return nil, fmt.Errorf("listando assets públicos: %w", err)
	}

	result := make([]AssetSummary, 0, len(rows))
	for _, row := range rows {
		item := AssetSummary{
			ID: row.ID,
			AssetType: TypeRef{
				ID:   row.AssetTypeID,
				Name: row.TypeName,
			},
			Latitude:  row.Latitude,
			Longitude: row.Longitude,
			QRCode:    row.QRCode,
		}

		if row.ThumbnailKey != nil && row.ThumbnailBucket != nil {
			bucket := s.defaultBucket
			if *row.ThumbnailBucket != "" {
				bucket = *row.ThumbnailBucket
			}
			url, sigErr := s.signer.GeneratePresignedGetURL(ctx, bucket, *row.ThumbnailKey)
			if sigErr == nil {
				item.ThumbnailURL = &url
			}
		}

		result = append(result, item)
	}
	return result, nil
}

// GetAsset retorna a ficha completa de um asset aprovado.
// Retorna 404 se o asset não existir ou não estiver aprovado.
func (s *Service) GetAsset(ctx context.Context, id string) (*AssetDetail, error) {
	row, err := s.repo.FindAssetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscando asset: %w", err)
	}
	if row == nil {
		return nil, apperror.NewNotFound("asset", id)
	}

	// Mídias
	mediaRows, err := s.repo.ListMediaByAsset(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscando mídias: %w", err)
	}
	mediaPublic := make([]MediaPublic, 0, len(mediaRows))
	for _, m := range mediaRows {
		url, sigErr := s.signer.GeneratePresignedGetURL(ctx, m.StorageBucket, m.StorageKey)
		if sigErr != nil {
			continue // não bloqueia a resposta se URL falhar
		}
		mediaPublic = append(mediaPublic, MediaPublic{ID: m.ID, Type: m.Type, URL: url})
	}

	// Manejos aprovados
	manejoRows, err := s.repo.ListManejosByAsset(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscando manejos: %w", err)
	}
	manejos := make([]ManejoPublic, 0, len(manejoRows))
	for _, m := range manejoRows {
		item := ManejoPublic{
			ID:          m.ID,
			Description: m.Description,
			CreatedAt:   m.CreatedAt,
		}
		if m.BeforeStorageKey != nil && m.BeforeBucket != nil {
			url, _ := s.signer.GeneratePresignedGetURL(ctx, *m.BeforeBucket, *m.BeforeStorageKey)
			if url != "" {
				item.BeforeMediaURL = &url
			}
		}
		if m.AfterStorageKey != nil && m.AfterBucket != nil {
			url, _ := s.signer.GeneratePresignedGetURL(ctx, *m.AfterBucket, *m.AfterStorageKey)
			if url != "" {
				item.AfterMediaURL = &url
			}
		}
		manejos = append(manejos, item)
	}

	// Monitoramentos aprovados
	monRows, err := s.repo.ListMonitoramentosByAsset(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscando monitoramentos: %w", err)
	}
	monitoramentos := make([]MonitoramentoPublic, 0, len(monRows))
	for _, m := range monRows {
		monitoramentos = append(monitoramentos, MonitoramentoPublic{
			ID:           m.ID,
			Notes:        m.Notes,
			HealthStatus: m.HealthStatus,
			CreatedAt:    m.CreatedAt,
		})
	}

	return &AssetDetail{
		ID: row.ID,
		AssetType: TypeRef{
			ID:   row.AssetTypeID,
			Name: row.TypeName,
		},
		Latitude:         row.Latitude,
		Longitude:        row.Longitude,
		QRCode:           row.QRCode,
		OrganizationName: row.OrganizationName,
		Media:            mediaPublic,
		Manejos:          manejos,
		Monitoramentos:   monitoramentos,
		CreatedAt:        row.CreatedAt,
	}, nil
}

// ResolveQR resolve um QR code para o asset_id correspondente.
// Retorna is_available=false se o asset não existir ou não estiver aprovado.
func (s *Service) ResolveQR(ctx context.Context, code string) (*QRResolveResponse, error) {
	assetID, err := s.repo.FindAssetByQRCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("resolvendo QR: %w", err)
	}
	if assetID == nil {
		return &QRResolveResponse{AssetID: nil, IsAvailable: false}, nil
	}
	return &QRResolveResponse{AssetID: assetID, IsAvailable: true}, nil
}


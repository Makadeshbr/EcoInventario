package asset

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// AssetTypeChecker é a interface estreita exigida do pacote assettype.
// Evita import cíclico e mantém este package com o mínimo de dependências.
type AssetTypeChecker interface {
	ExistsInOrg(ctx context.Context, id, orgID string) (bool, error)
}

// MediaChecker verifica se um asset possui pelo menos uma mídia com upload
// concluído — pré-requisito para submit (API_CONTRACTS §6).
type MediaChecker interface {
	HasUploadedMedia(ctx context.Context, assetID string) (bool, error)
}

// Service implementa a lógica de negócio para assets.
type Service struct {
	repo     Repository
	typeRepo AssetTypeChecker
	media    MediaChecker
	audit    *audit.Service
	policy   assetMutationPolicy
}

// NewService cria o serviço de assets.
func NewService(repo Repository, typeRepo AssetTypeChecker, media MediaChecker, auditSvc *audit.Service) *Service {
	return &Service{repo: repo, typeRepo: typeRepo, media: media, audit: auditSvc, policy: assetMutationPolicy{}}
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

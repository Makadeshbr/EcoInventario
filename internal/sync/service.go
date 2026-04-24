package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// EntityDispatcher abstrai operações de entidade necessárias para o sync.
type EntityDispatcher interface {
	// Create cria uma entidade a partir do payload. Retorna ID, updated_at e resultado serializado.
	Create(ctx context.Context, entityType string, payload json.RawMessage) (entityID string, updatedAt time.Time, result json.RawMessage, err error)
	// Update atualiza uma entidade. Retorna novo updated_at e resultado serializado.
	Update(ctx context.Context, entityType, entityID string, payload json.RawMessage) (updatedAt time.Time, result json.RawMessage, err error)
	// GetCurrentState retorna updated_at e dados atuais da entidade.
	// Retorna nil updatedAt se a entidade não existir.
	GetCurrentState(ctx context.Context, entityType, entityID string) (updatedAt *time.Time, data json.RawMessage, err error)
	// Delete faz soft delete de uma entidade.
	Delete(ctx context.Context, entityType, entityID string) error
}

// Service implementa a lógica de sync push e pull.
type Service struct {
	idempotency IdempotencyRepository
	dispatcher  EntityDispatcher
	syncRepo    SyncRepository
}

// NewService cria o serviço de sync.
func NewService(idem IdempotencyRepository, dispatcher EntityDispatcher, syncRepo SyncRepository) *Service {
	return &Service{idempotency: idem, dispatcher: dispatcher, syncRepo: syncRepo}
}

// ProcessPush processa um batch de operações push do mobile.
// Cada operação é processada de forma independente — falhas individuais
// não abortam o batch.
func (s *Service) ProcessPush(ctx context.Context, req PushRequest) (*PushResponse, error) {
	if len(req.Operations) > 50 {
		return nil, &apperror.AppError{
			Code:    "VALIDATION_ERROR",
			Message: "Máximo de 50 operações por batch",
			Status:  400,
		}
	}

	results := make([]OperationResult, 0, len(req.Operations))
	for _, op := range req.Operations {
		results = append(results, s.processOperation(ctx, op))
	}

	return &PushResponse{
		Results:    results,
		ServerTime: time.Now().UTC(),
	}, nil
}

func (s *Service) processOperation(ctx context.Context, op Operation) OperationResult {
	// Verifica idempotência — retorna resultado anterior se já processada.
	existing, err := s.idempotency.Find(ctx, op.IdempotencyKey)
	if err != nil {
		slog.Error("sync: erro ao verificar idempotência", "key", op.IdempotencyKey, "error", err)
		return errResult(op, "erro interno ao verificar idempotência")
	}
	if existing != nil {
		var prev OperationResult
		if jsonErr := json.Unmarshal(existing.Result, &prev); jsonErr == nil {
			return OperationResult{
				IdempotencyKey:  op.IdempotencyKey,
				Status:          StatusDuplicate,
				EntityID:        prev.EntityID,
				ServerUpdatedAt: prev.ServerUpdatedAt,
			}
		}
		return OperationResult{
			IdempotencyKey: op.IdempotencyKey,
			Status:         StatusDuplicate,
			EntityID:       existing.EntityID,
		}
	}

	var result OperationResult
	switch op.Action {
	case ActionCreate:
		result = s.handleCreate(ctx, op)
	case ActionUpdate:
		result = s.handleUpdate(ctx, op)
	case ActionDelete:
		result = s.handleDelete(ctx, op)
	default:
		result = errResult(op, fmt.Sprintf("ação desconhecida: %s", op.Action))
	}

	// Persiste apenas resultados definitivos (ok e conflict) para replay.
	if result.Status == StatusOk || result.Status == StatusConflict {
		if data, marshalErr := json.Marshal(result); marshalErr == nil {
			if storeErr := s.idempotency.Store(ctx, &IdempotencyRecord{
				IdempotencyKey: op.IdempotencyKey,
				EntityType:     op.EntityType,
				EntityID:       result.EntityID,
				Result:         data,
			}); storeErr != nil {
				slog.Error("sync: falha ao armazenar idempotency", "key", op.IdempotencyKey, "error", storeErr)
			}
		}
	}

	return result
}

func (s *Service) handleCreate(ctx context.Context, op Operation) OperationResult {
	entityID, updatedAt, _, err := s.dispatcher.Create(ctx, op.EntityType, op.Payload)
	if err != nil {
		return errResult(op, err.Error())
	}
	return OperationResult{
		IdempotencyKey:  op.IdempotencyKey,
		Status:          StatusOk,
		EntityID:        entityID,
		ServerUpdatedAt: &updatedAt,
	}
}

func (s *Service) handleUpdate(ctx context.Context, op Operation) OperationResult {
	if op.ClientUpdatedAt == nil {
		return errResult(op, "client_updated_at é obrigatório para UPDATE")
	}

	orgID := shared.GetOrgID(ctx)
	_ = orgID // orgID já está no ctx; usado internamente pelo dispatcher

	serverAt, serverData, err := s.dispatcher.GetCurrentState(ctx, op.EntityType, op.EntityID)
	if err != nil {
		return errResult(op, err.Error())
	}
	if serverAt == nil {
		return errResult(op, fmt.Sprintf("entidade não encontrada: %s %s", op.EntityType, op.EntityID))
	}

	// Conflito = timestamps diferentes (optimistic locking).
	if !serverAt.Equal(*op.ClientUpdatedAt) {
		return OperationResult{
			IdempotencyKey: op.IdempotencyKey,
			Status:         StatusConflict,
			EntityID:       op.EntityID,
			ServerVersion: &VersionInfo{
				UpdatedAt: *serverAt,
				Data:      serverData,
			},
			ClientVersion: &VersionInfo{
				UpdatedAt: *op.ClientUpdatedAt,
			},
		}
	}

	updatedAt, _, err := s.dispatcher.Update(ctx, op.EntityType, op.EntityID, op.Payload)
	if err != nil {
		return errResult(op, err.Error())
	}
	return OperationResult{
		IdempotencyKey:  op.IdempotencyKey,
		Status:          StatusOk,
		EntityID:        op.EntityID,
		ServerUpdatedAt: &updatedAt,
	}
}

func (s *Service) handleDelete(ctx context.Context, op Operation) OperationResult {
	if err := s.dispatcher.Delete(ctx, op.EntityType, op.EntityID); err != nil {
		return errResult(op, err.Error())
	}
	now := time.Now().UTC()
	return OperationResult{
		IdempotencyKey:  op.IdempotencyKey,
		Status:          StatusOk,
		EntityID:        op.EntityID,
		ServerUpdatedAt: &now,
	}
}

// ProcessPull retorna todas as mudanças desde o timestamp `since`.
func (s *Service) ProcessPull(ctx context.Context, p PullParams) (*PullResponse, error) {
	orgID := shared.GetOrgID(ctx)
	p.OrgID = orgID

	if p.Limit <= 0 || p.Limit > 500 {
		p.Limit = 100
	}

	// Solicita limit+1 para detectar has_more.
	queryLimit := p.Limit + 1
	pullP := p
	pullP.Limit = queryLimit

	changes, err := s.syncRepo.PullChanges(ctx, pullP)
	if err != nil {
		return nil, fmt.Errorf("buscando alterações: %w", err)
	}

	hasMore := len(changes) > p.Limit
	if hasMore {
		changes = changes[:p.Limit]
	}

	var nextCursor *string
	if hasMore && len(changes) > 0 {
		cursor := changes[len(changes)-1].UpdatedAt.UTC().Format(time.RFC3339Nano)
		nextCursor = &cursor
	}

	if changes == nil {
		changes = []Change{}
	}

	return &PullResponse{
		Changes:    changes,
		HasMore:    hasMore,
		NextCursor: nextCursor,
		ServerTime: time.Now().UTC(),
	}, nil
}

func errResult(op Operation, msg string) OperationResult {
	return OperationResult{
		IdempotencyKey: op.IdempotencyKey,
		Status:         StatusError,
		EntityID:       op.EntityID,
		Error:          msg,
	}
}

package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
	"github.com/google/uuid"
)

// Service implementa a lógica de autenticação.
type Service struct {
	repo          Repository
	pepper        string
	jwtSvc        *JWTService
	refreshExpiry time.Duration
	audit         *audit.Service
}

// NewService cria o serviço de auth com todas as dependências injetadas.
func NewService(repo Repository, auditSvc *audit.Service, pepper, jwtPrivB64, jwtPubB64 string, accessExpiry, refreshExpiry time.Duration) (*Service, error) {
	jwtSvc, err := NewJWTService(jwtPrivB64, jwtPubB64, accessExpiry)
	if err != nil {
		return nil, fmt.Errorf("inicializando jwt service: %w", err)
	}
	return &Service{
		repo:          repo,
		pepper:        pepper,
		jwtSvc:        jwtSvc,
		refreshExpiry: refreshExpiry,
		audit:         auditSvc,
	}, nil
}

var errUnauthorized = apperror.NewUnauthorized("Credenciais inválidas")

// Login autentica o usuário e retorna access + refresh tokens.
func (s *Service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	user, err := s.repo.FindUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("buscando usuário: %w", err)
	}
	if user == nil || !user.IsActive {
		return nil, errUnauthorized
	}

	ok, err := VerifyPassword(req.Password, user.PasswordHash, s.pepper)
	if err != nil || !ok {
		return nil, errUnauthorized
	}

	accessToken, err := s.jwtSvc.GenerateAccessToken(user.ID, user.OrganizationID, user.Role)
	if err != nil {
		return nil, fmt.Errorf("gerando access token: %w", err)
	}

	rawToken, _, _, err := s.newRefreshToken(ctx, user.ID, "")
	if err != nil {
		return nil, err
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: user.OrganizationID,
		EntityType:     "user",
		EntityID:       user.ID,
		Action:         "login",
		PerformedBy:    user.ID,
	})

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: rawToken,
		ExpiresIn:    int(s.jwtSvc.expiry.Seconds()),
		User: UserInfo{
			ID:             user.ID,
			Name:           user.Name,
			Email:          user.Email,
			Role:           user.Role,
			OrganizationID: user.OrganizationID,
		},
	}, nil
}

// RefreshToken valida o refresh token, revoga o anterior e emite novo par.
func (s *Service) RefreshToken(ctx context.Context, req RefreshRequest) (*RefreshResponse, error) {
	tokenHash := hashToken(req.RefreshToken)

	rt, err := s.repo.FindRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, apperror.NewUnauthorized("Token inválido ou expirado")
	}

	// token revogado = possível roubo → revoga família inteira
	if rt.IsRevoked {
		_ = s.repo.RevokeFamily(ctx, rt.FamilyID)
		return nil, apperror.NewUnauthorized("Token inválido ou expirado")
	}

	if time.Now().After(rt.ExpiresAt) {
		return nil, apperror.NewUnauthorized("Token inválido ou expirado")
	}

	// busca dados do usuário para gerar novo access token
	// o user_id está no refresh token record
	userRecord, err := s.findUserByID(ctx, rt.UserID)
	if err != nil || userRecord == nil || !userRecord.IsActive {
		return nil, apperror.NewUnauthorized("Token inválido ou expirado")
	}

	// revoga token atual antes de emitir novo (rotation)
	if err := s.repo.RevokeRefreshToken(ctx, tokenHash); err != nil {
		return nil, fmt.Errorf("revogando token anterior: %w", err)
	}

	accessToken, err := s.jwtSvc.GenerateAccessToken(userRecord.ID, userRecord.OrganizationID, userRecord.Role)
	if err != nil {
		return nil, fmt.Errorf("gerando access token: %w", err)
	}

	// novo refresh token mantém o mesmo family_id
	rawToken, _, _, err := s.newRefreshToken(ctx, rt.UserID, rt.FamilyID)
	if err != nil {
		return nil, err
	}

	s.audit.Log(ctx, audit.Entry{
		OrganizationID: userRecord.OrganizationID,
		EntityType:     "user",
		EntityID:       userRecord.ID,
		Action:         "refresh",
		PerformedBy:    userRecord.ID,
	})

	return &RefreshResponse{
		AccessToken:  accessToken,
		RefreshToken: rawToken,
		ExpiresIn:    int(s.jwtSvc.expiry.Seconds()),
	}, nil
}

// Logout revoga o refresh token informado.
func (s *Service) Logout(ctx context.Context, req LogoutRequest) error {
	tokenHash := hashToken(req.RefreshToken)

	rt, err := s.repo.FindRefreshToken(ctx, tokenHash)
	if err != nil {
		// token não encontrado — logout silencioso (idempotente)
		var appErr *apperror.AppError
		if errors.As(err, &appErr) {
			return nil
		}
		return fmt.Errorf("buscando token: %w", err)
	}

	userID := shared.GetUserID(ctx)
	if userID != "" && rt.UserID != userID {
		return apperror.NewForbidden("Token não pertence ao usuário")
	}

	if err := s.repo.RevokeRefreshToken(ctx, tokenHash); err != nil {
		return err
	}

	s.audit.Log(ctx, audit.Entry{
		EntityType:  "user",
		EntityID:    rt.UserID,
		Action:      "logout",
		PerformedBy: rt.UserID,
	})

	return nil
}

// newRefreshToken cria, persiste e retorna o raw token, hash e familyID.
// Se familyID estiver vazio, gera um novo.
func (s *Service) newRefreshToken(ctx context.Context, userID, familyID string) (rawToken, tokenHash, family string, err error) {
	if familyID == "" {
		familyID = uuid.New().String()
	}

	rawToken = "rt_" + uuid.New().String()
	tokenHash = hashToken(rawToken)
	id := uuid.New().String()

	rt := &RefreshTokenRecord{
		ID:        id,
		UserID:    userID,
		TokenHash: tokenHash,
		FamilyID:  familyID,
		ExpiresAt: time.Now().Add(s.refreshExpiry),
	}

	if insertErr := s.repo.InsertRefreshToken(ctx, rt); insertErr != nil {
		return "", "", "", fmt.Errorf("salvando refresh token: %w", insertErr)
	}

	return rawToken, tokenHash, familyID, nil
}

func (s *Service) findUserByID(ctx context.Context, userID string) (*UserRecord, error) {
	return s.repo.FindUserByID(ctx, userID)
}

// hashToken gera SHA-256 hex do token.
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

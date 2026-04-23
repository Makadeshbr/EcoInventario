package auth

import (
	"crypto/ed25519"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims representa o payload do access token JWT.
type Claims struct {
	Sub  string `json:"sub"`
	Org  string `json:"org"`
	Role string `json:"role"`
	Jti  string `json:"jti"`
	jwt.RegisteredClaims
}

// JWTService gera e valida access tokens Ed25519 (EdDSA).
type JWTService struct {
	privateKey ed25519.PrivateKey
	publicKey  ed25519.PublicKey
	expiry     time.Duration
}

// NewJWTService cria JWTService a partir de chaves Ed25519 codificadas em base64.
func NewJWTService(privateKeyB64, publicKeyB64 string, expiry time.Duration) (*JWTService, error) {
	privBytes, err := base64.StdEncoding.DecodeString(privateKeyB64)
	if err != nil {
		return nil, fmt.Errorf("decodificando chave privada: %w", err)
	}
	if len(privBytes) != ed25519.PrivateKeySize {
		return nil, errors.New("chave privada Ed25519 inválida: tamanho incorreto")
	}

	pubBytes, err := base64.StdEncoding.DecodeString(publicKeyB64)
	if err != nil {
		return nil, fmt.Errorf("decodificando chave pública: %w", err)
	}
	if len(pubBytes) != ed25519.PublicKeySize {
		return nil, errors.New("chave pública Ed25519 inválida: tamanho incorreto")
	}

	return &JWTService{
		privateKey: ed25519.PrivateKey(privBytes),
		publicKey:  ed25519.PublicKey(pubBytes),
		expiry:     expiry,
	}, nil
}

// GenerateAccessToken cria um JWT assinado com Ed25519.
func (s *JWTService) GenerateAccessToken(userID, orgID, role string) (string, error) {
	now := time.Now()
	claims := Claims{
		Sub:  userID,
		Org:  orgID,
		Role: role,
		Jti:  uuid.New().String(),
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.expiry)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
	signed, err := token.SignedString(s.privateKey)
	if err != nil {
		return "", fmt.Errorf("assinando token: %w", err)
	}
	return signed, nil
}

// ValidateAccessToken valida o JWT e retorna os claims se válido.
func (s *JWTService) ValidateAccessToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok {
			return nil, fmt.Errorf("algoritmo inesperado: %v", t.Header["alg"])
		}
		return s.publicKey, nil
	})
	if err != nil {
		return nil, fmt.Errorf("token inválido: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("claims inválidos")
	}
	return claims, nil
}

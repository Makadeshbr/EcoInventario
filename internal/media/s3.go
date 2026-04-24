package media

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// S3Client é a interface estreita de operações S3 exigidas pelo serviço de media.
// Permite mock em testes sem depender do cliente real do MinIO.
type S3Client interface {
	// GeneratePresignedPutURL gera URL assinada para upload direto (15min).
	GeneratePresignedPutURL(ctx context.Context, bucket, key string) (string, error)
	// GeneratePresignedGetURL gera URL assinada para download (1h).
	GeneratePresignedGetURL(ctx context.Context, bucket, key string) (string, error)
	// ObjectExists verifica se o objeto realmente existe no bucket.
	ObjectExists(ctx context.Context, bucket, key string) (bool, error)
}

const (
	PresignedPutExpiry = 15 * time.Minute
	PresignedGetExpiry = 1 * time.Hour
)

// s3client é a implementação real usando minio-go.
type s3client struct {
	client *minio.Client
}

// NewS3Client cria o cliente MinIO/S3.
// useSSL=false para MinIO local. Remove http:// ou https:// do endpoint se presente,
// pois o minio.New exige apenas host:port.
func NewS3Client(endpoint, accessKey, secretKey string, useSSL bool) (S3Client, error) {
	// MinIO client exige o endpoint sem o scheme (http/https)
	cleanEndpoint := endpoint
	if len(endpoint) > 7 && endpoint[:7] == "http://" {
		cleanEndpoint = endpoint[7:]
	} else if len(endpoint) > 8 && endpoint[:8] == "https://" {
		cleanEndpoint = endpoint[8:]
	}

	c, err := minio.New(cleanEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("criando cliente S3: %w", err)
	}
	return &s3client{client: c}, nil
}

func (s *s3client) GeneratePresignedPutURL(ctx context.Context, bucket, key string) (string, error) {
	u, err := s.client.PresignedPutObject(ctx, bucket, key, PresignedPutExpiry)
	if err != nil {
		return "", fmt.Errorf("gerando presigned PUT URL: %w", err)
	}
	return u.String(), nil
}

func (s *s3client) GeneratePresignedGetURL(ctx context.Context, bucket, key string) (string, error) {
	u, err := s.client.PresignedGetObject(ctx, bucket, key, PresignedGetExpiry, nil)
	if err != nil {
		return "", fmt.Errorf("gerando presigned GET URL: %w", err)
	}
	return u.String(), nil
}

func (s *s3client) ObjectExists(ctx context.Context, bucket, key string) (bool, error) {
	_, err := s.client.StatObject(ctx, bucket, key, minio.StatObjectOptions{})
	if err != nil {
		// minio-go retorna ErrorResponse com StatusCode 404 para objeto ausente.
		errResp := minio.ToErrorResponse(err)
		if errResp.StatusCode == http.StatusNotFound {
			return false, nil
		}
		return false, fmt.Errorf("verificando objeto no S3: %w", err)
	}
	return true, nil
}

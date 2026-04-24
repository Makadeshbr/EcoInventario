package media_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/media"
	"github.com/allan/ecoinventario/internal/shared"
)

// --- stubs ---

type stubRepo struct {
	media           map[string]*media.Media // id → media
	byIdempotency   map[string]*media.Media // idempotency_key → media
	uploadedCounts  map[string]int          // asset_id → count
}

func newStubRepo() *stubRepo {
	return &stubRepo{
		media:          make(map[string]*media.Media),
		byIdempotency:  make(map[string]*media.Media),
		uploadedCounts: make(map[string]int),
	}
}

func (r *stubRepo) Insert(_ context.Context, m *media.Media) error {
	if m.ID == "" {
		m.ID = "generated-id"
	}
	m.CreatedAt = time.Now()
	r.media[m.ID] = m
	if m.IdempotencyKey != "" {
		r.byIdempotency[m.IdempotencyKey] = m
	}
	return nil
}

func (r *stubRepo) FindByID(_ context.Context, id, _ string) (*media.Media, error) {
	m, ok := r.media[id]
	if !ok {
		return nil, nil
	}
	return m, nil
}

func (r *stubRepo) FindByIdempotencyKey(_ context.Context, key string) (*media.Media, error) {
	m, ok := r.byIdempotency[key]
	if !ok {
		return nil, nil
	}
	return m, nil
}

func (r *stubRepo) Update(_ context.Context, m *media.Media) error {
	existing, ok := r.media[m.ID]
	if !ok {
		return errors.New("não encontrado")
	}
	existing.UploadStatus = m.UploadStatus
	return nil
}

func (r *stubRepo) SoftDelete(_ context.Context, id, _ string) error {
	if _, ok := r.media[id]; !ok {
		return errors.New("não encontrado")
	}
	delete(r.media, id)
	return nil
}

func (r *stubRepo) ListByAsset(_ context.Context, assetID, _ string) ([]*media.Media, error) {
	var result []*media.Media
	for _, m := range r.media {
		if m.AssetID == assetID {
			result = append(result, m)
		}
	}
	return result, nil
}

func (r *stubRepo) CountUploadedByAsset(_ context.Context, assetID string) (int, error) {
	return r.uploadedCounts[assetID], nil
}

func (r *stubRepo) HasUploaded(_ context.Context, assetID string) (bool, error) {
	return r.uploadedCounts[assetID] > 0, nil
}

// stubS3 simula o cliente S3.
type stubS3 struct {
	objectExists bool
	putURL       string
	getURL       string
	errOnExists  error
}

func (s *stubS3) GeneratePresignedPutURL(_ context.Context, _, _ string) (string, error) {
	if s.putURL == "" {
		return "https://s3.example.com/put-url", nil
	}
	return s.putURL, nil
}

func (s *stubS3) GeneratePresignedGetURL(_ context.Context, _, _ string) (string, error) {
	if s.getURL == "" {
		return "https://s3.example.com/get-url", nil
	}
	return s.getURL, nil
}

func (s *stubS3) ObjectExists(_ context.Context, _, _ string) (bool, error) {
	return s.objectExists, s.errOnExists
}

// stubAssetChecker simula a verificação de asset na org.
type stubAssetChecker struct{ exists bool }

func (s *stubAssetChecker) ExistsInOrg(_ context.Context, _, _ string) (bool, error) {
	return s.exists, nil
}

// stubAuditRepo satisfaz audit.Repository.
type stubAuditRepo struct{}

func (s *stubAuditRepo) Insert(_ context.Context, _ *audit.LogEntry) error { return nil }

// ctx com user_id e org_id preenchidos.
func ctxWithClaims(userID, orgID string) context.Context {
	ctx := context.Background()
	ctx = shared.WithUserID(ctx, userID)
	ctx = shared.WithOrgID(ctx, orgID)
	return ctx
}

func newSvc(repo media.Repository, s3 media.S3Client, assetExists bool) *media.Service {
	auditSvc := audit.NewService(&stubAuditRepo{})
	return media.NewService(repo, s3, &stubAssetChecker{exists: assetExists}, auditSvc, "test-bucket")
}

// --- testes ---

func TestGenerateUploadURL_Success(t *testing.T) {
	repo := newStubRepo()
	svc := newSvc(repo, &stubS3{}, true)

	ctx := ctxWithClaims("user-1", "org-1")
	req := media.UploadURLRequest{
		AssetID:        "asset-1",
		MediaType:      media.TypeGeneral,
		MimeType:       "image/jpeg",
		SizeBytes:      1024,
		IdempotencyKey: "idem-key-1",
	}

	resp, err := svc.GenerateUploadURL(ctx, req)
	if err != nil {
		t.Fatalf("esperava sucesso, got: %v", err)
	}
	if resp.MediaID == "" {
		t.Error("MediaID não deve ser vazio")
	}
	if resp.UploadURL == "" {
		t.Error("UploadURL não deve ser vazia")
	}
	if resp.ExpiresIn != int(media.PresignedPutExpiry.Seconds()) {
		t.Errorf("ExpiresIn: got %d, want %d", resp.ExpiresIn, int(media.PresignedPutExpiry.Seconds()))
	}
}

func TestGenerateUploadURL_InvalidMIME(t *testing.T) {
	svc := newSvc(newStubRepo(), &stubS3{}, true)
	ctx := ctxWithClaims("user-1", "org-1")

	_, err := svc.GenerateUploadURL(ctx, media.UploadURLRequest{
		AssetID:        "asset-1",
		MediaType:      media.TypeGeneral,
		MimeType:       "application/pdf", // inválido
		SizeBytes:      1024,
		IdempotencyKey: "idem-key-2",
	})
	if err == nil {
		t.Fatal("esperava erro para MIME type inválido")
	}
}

func TestGenerateUploadURL_AssetNotFound(t *testing.T) {
	svc := newSvc(newStubRepo(), &stubS3{}, false) // asset não existe

	ctx := ctxWithClaims("user-1", "org-1")
	_, err := svc.GenerateUploadURL(ctx, media.UploadURLRequest{
		AssetID:        "nao-existe",
		MediaType:      media.TypeGeneral,
		MimeType:       "image/png",
		SizeBytes:      512,
		IdempotencyKey: "idem-key-3",
	})
	if err == nil {
		t.Fatal("esperava NOT_FOUND para asset inexistente")
	}
}

func TestGenerateUploadURL_MaxPerAsset(t *testing.T) {
	repo := newStubRepo()
	// Simula 20 uploads já feitos.
	repo.uploadedCounts["asset-full"] = media.MaxPerAsset

	svc := newSvc(repo, &stubS3{}, true)
	ctx := ctxWithClaims("user-1", "org-1")

	_, err := svc.GenerateUploadURL(ctx, media.UploadURLRequest{
		AssetID:        "asset-full",
		MediaType:      media.TypeGeneral,
		MimeType:       "image/png",
		SizeBytes:      512,
		IdempotencyKey: "idem-key-4",
	})
	if err == nil {
		t.Fatal("esperava erro: limite de 20 fotos excedido")
	}
}

func TestGenerateUploadURL_Idempotent(t *testing.T) {
	repo := newStubRepo()
	svc := newSvc(repo, &stubS3{}, true)
	ctx := ctxWithClaims("user-1", "org-1")

	req := media.UploadURLRequest{
		AssetID:        "asset-1",
		MediaType:      media.TypeGeneral,
		MimeType:       "image/jpeg",
		SizeBytes:      1024,
		IdempotencyKey: "idem-key-5",
	}

	resp1, err := svc.GenerateUploadURL(ctx, req)
	if err != nil {
		t.Fatalf("primeira chamada falhou: %v", err)
	}

	// Segunda chamada com a mesma idempotency_key deve retornar o mesmo media_id.
	resp2, err := svc.GenerateUploadURL(ctx, req)
	if err != nil {
		t.Fatalf("segunda chamada falhou: %v", err)
	}
	if resp1.MediaID != resp2.MediaID {
		t.Errorf("idempotência violada: IDs diferentes (%s != %s)", resp1.MediaID, resp2.MediaID)
	}
}

func TestConfirm_Success(t *testing.T) {
	repo := newStubRepo()
	s3 := &stubS3{objectExists: true}
	svc := newSvc(repo, s3, true)
	ctx := ctxWithClaims("user-1", "org-1")

	// Insere media pendente diretamente no repo.
	m := &media.Media{
		ID:             "media-1",
		OrganizationID: "org-1",
		AssetID:        "asset-1",
		StorageKey:     "org-1/assets/asset-1/media-1.jpg",
		StorageBucket:  "test-bucket",
		MimeType:       "image/jpeg",
		SizeBytes:      1024,
		Type:           media.TypeGeneral,
		UploadStatus:   media.UploadStatusPending,
	}
	_ = repo.Insert(context.Background(), m)

	resp, err := svc.Confirm(ctx, "media-1")
	if err != nil {
		t.Fatalf("esperava sucesso: %v", err)
	}
	if resp.UploadStatus != media.UploadStatusUploaded {
		t.Errorf("status: got %s, want %s", resp.UploadStatus, media.UploadStatusUploaded)
	}
}

func TestConfirm_ObjectNotInS3(t *testing.T) {
	repo := newStubRepo()
	s3 := &stubS3{objectExists: false} // objeto não existe no S3
	svc := newSvc(repo, s3, true)
	ctx := ctxWithClaims("user-1", "org-1")

	m := &media.Media{
		ID: "media-2", OrganizationID: "org-1", AssetID: "asset-1",
		StorageKey: "key", StorageBucket: "test-bucket",
		MimeType: "image/jpeg", SizeBytes: 512, Type: media.TypeGeneral,
		UploadStatus: media.UploadStatusPending,
	}
	_ = repo.Insert(context.Background(), m)

	_, err := svc.Confirm(ctx, "media-2")
	if err == nil {
		t.Fatal("esperava erro: objeto não existe no S3")
	}
}

func TestConfirm_NotFound(t *testing.T) {
	svc := newSvc(newStubRepo(), &stubS3{}, true)
	ctx := ctxWithClaims("user-1", "org-1")

	_, err := svc.Confirm(ctx, "inexistente")
	if err == nil {
		t.Fatal("esperava NOT_FOUND")
	}
}

func TestGetByID_ReturnsPresignedURL(t *testing.T) {
	repo := newStubRepo()
	wantURL := "https://s3.example.com/signed-get"
	s3 := &stubS3{getURL: wantURL}
	svc := newSvc(repo, s3, true)
	ctx := ctxWithClaims("user-1", "org-1")

	m := &media.Media{
		ID: "media-3", OrganizationID: "org-1", AssetID: "asset-1",
		StorageKey: "key", StorageBucket: "test-bucket",
		MimeType: "image/jpeg", SizeBytes: 512, Type: media.TypeGeneral,
		UploadStatus: media.UploadStatusUploaded,
	}
	_ = repo.Insert(context.Background(), m)

	resp, err := svc.GetByID(ctx, "media-3")
	if err != nil {
		t.Fatalf("esperava sucesso: %v", err)
	}
	if resp.URL != wantURL {
		t.Errorf("URL: got %s, want %s", resp.URL, wantURL)
	}
}

func TestGetByID_NotFound(t *testing.T) {
	svc := newSvc(newStubRepo(), &stubS3{}, true)
	ctx := ctxWithClaims("user-1", "org-1")

	_, err := svc.GetByID(ctx, "nao-existe")
	if err == nil {
		t.Fatal("esperava NOT_FOUND")
	}
}

func TestSoftDelete_Success(t *testing.T) {
	repo := newStubRepo()
	svc := newSvc(repo, &stubS3{}, true)
	ctx := ctxWithClaims("user-1", "org-1")

	m := &media.Media{
		ID: "media-4", OrganizationID: "org-1", AssetID: "asset-1",
		StorageKey: "key", StorageBucket: "test-bucket",
		MimeType: "image/jpeg", SizeBytes: 512, Type: media.TypeGeneral,
		UploadStatus: media.UploadStatusUploaded,
	}
	_ = repo.Insert(context.Background(), m)

	if err := svc.SoftDelete(ctx, "media-4"); err != nil {
		t.Fatalf("esperava sucesso: %v", err)
	}

	// Após soft delete, media não deve ser encontrada.
	found, _ := repo.FindByID(context.Background(), "media-4", "org-1")
	if found != nil {
		t.Error("media deveria ter sido deletada")
	}
}

func TestSoftDelete_NotFound(t *testing.T) {
	svc := newSvc(newStubRepo(), &stubS3{}, true)
	ctx := ctxWithClaims("user-1", "org-1")

	if err := svc.SoftDelete(ctx, "nao-existe"); err == nil {
		t.Fatal("esperava NOT_FOUND")
	}
}

func TestHasUploadedMedia_True(t *testing.T) {
	repo := newStubRepo()
	repo.uploadedCounts["asset-com-media"] = 2
	svc := newSvc(repo, &stubS3{}, true)

	has, err := svc.HasUploadedMedia(context.Background(), "asset-com-media")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if !has {
		t.Error("esperava true: asset tem mídia enviada")
	}
}

func TestHasUploadedMedia_False(t *testing.T) {
	repo := newStubRepo()
	svc := newSvc(repo, &stubS3{}, true)

	has, err := svc.HasUploadedMedia(context.Background(), "asset-sem-media")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if has {
		t.Error("esperava false: asset não tem mídia")
	}
}

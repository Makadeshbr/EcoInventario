package public_test

import (
	"context"
	"testing"
	"time"

	"github.com/allan/ecoinventario/internal/public"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// --- mocks ---

type mockRepo struct {
	types          []public.AssetTypeItem
	summaries      []public.AssetSummaryRow
	assetDetail    *public.AssetDetailRow
	qrAssetID      *string
	media          []public.MediaRow
	manejos        []public.ManejoRow
	monitoramentos []public.MonitoramentoRow
}

func (m *mockRepo) ListAssetTypes(_ context.Context) ([]public.AssetTypeItem, error) {
	return m.types, nil
}

func (m *mockRepo) ListAssetsByBounds(_ context.Context, _ public.BoundsParams) ([]public.AssetSummaryRow, error) {
	return m.summaries, nil
}

func (m *mockRepo) FindAssetByID(_ context.Context, _ string) (*public.AssetDetailRow, error) {
	return m.assetDetail, nil
}

func (m *mockRepo) FindAssetByQRCode(_ context.Context, _ string) (*string, error) {
	return m.qrAssetID, nil
}

func (m *mockRepo) ListMediaByAsset(_ context.Context, _ string) ([]public.MediaRow, error) {
	return m.media, nil
}

func (m *mockRepo) ListManejosByAsset(_ context.Context, _ string) ([]public.ManejoRow, error) {
	return m.manejos, nil
}

func (m *mockRepo) ListMonitoramentosByAsset(_ context.Context, _ string) ([]public.MonitoramentoRow, error) {
	return m.monitoramentos, nil
}

type mockSigner struct {
	url string
	err error
}

func (m *mockSigner) GeneratePresignedGetURL(_ context.Context, _, _ string) (string, error) {
	return m.url, m.err
}

func newSvc(repo public.Repository, signer public.URLSigner) *public.Service {
	return public.NewService(repo, signer, "test-bucket")
}

// --- ListAssetTypes ---

func TestListAssetTypes(t *testing.T) {
	repo := &mockRepo{
		types: []public.AssetTypeItem{
			{ID: "at-1", Name: "Árvore"},
			{ID: "at-2", Name: "Colônia"},
		},
	}
	svc := newSvc(repo, &mockSigner{url: "https://cdn"})

	result, err := svc.ListAssetTypes(context.Background())
	if err != nil {
		t.Fatalf("erro: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("len: got %d, want 2", len(result))
	}
	if result[0].Name != "Árvore" {
		t.Errorf("name: got %q", result[0].Name)
	}
}

// --- ListAssets ---

func TestListAssets(t *testing.T) {
	key := "org/assets/a1/photo.jpg"
	bucket := "eco"
	repo := &mockRepo{
		summaries: []public.AssetSummaryRow{
			{
				ID: "a-1", AssetTypeID: "at-1", TypeName: "Árvore",
				Latitude: -23.5, Longitude: -46.6, QRCode: "qr-1",
				ThumbnailKey: &key, ThumbnailBucket: &bucket,
			},
			{
				ID: "a-2", AssetTypeID: "at-1", TypeName: "Árvore",
				Latitude: -23.6, Longitude: -46.7, QRCode: "qr-2",
			},
		},
	}
	svc := newSvc(repo, &mockSigner{url: "https://cdn/photo.jpg"})

	result, err := svc.ListAssets(context.Background(), public.BoundsParams{
		SWLat: -24, SWLng: -47, NELat: -23, NELng: -46, Limit: 100,
	})
	if err != nil {
		t.Fatalf("erro: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("len: got %d, want 2", len(result))
	}
	// Primeiro item tem thumbnail
	if result[0].ThumbnailURL == nil || *result[0].ThumbnailURL != "https://cdn/photo.jpg" {
		t.Errorf("thumbnail_url: %v", result[0].ThumbnailURL)
	}
	// Segundo item sem thumbnail
	if result[1].ThumbnailURL != nil {
		t.Errorf("thumbnail_url deveria ser nil, got %v", result[1].ThumbnailURL)
	}
}

// --- GetAsset ---

func TestGetAsset_Found(t *testing.T) {
	createdAt := time.Date(2025, 6, 1, 10, 0, 0, 0, time.UTC)
	repo := &mockRepo{
		assetDetail: &public.AssetDetailRow{
			ID: "a-1", AssetTypeID: "at-1", TypeName: "Árvore",
			Latitude: -23.5, Longitude: -46.6, QRCode: "qr-1",
			OrganizationName: "Sec. Meio Ambiente", CreatedAt: createdAt,
		},
		media: []public.MediaRow{
			{ID: "m-1", StorageKey: "key1", StorageBucket: "bucket", Type: "general"},
		},
		manejos: []public.ManejoRow{
			{ID: "man-1", Description: "Poda de formação", CreatedAt: createdAt},
		},
		monitoramentos: []public.MonitoramentoRow{
			{ID: "mon-1", Notes: "Bom estado", HealthStatus: "healthy", CreatedAt: createdAt},
		},
	}
	svc := newSvc(repo, &mockSigner{url: "https://cdn/img.jpg"})

	resp, err := svc.GetAsset(context.Background(), "a-1")
	if err != nil {
		t.Fatalf("erro: %v", err)
	}

	if resp.ID != "a-1" {
		t.Errorf("id: %q", resp.ID)
	}
	if resp.OrganizationName != "Sec. Meio Ambiente" {
		t.Errorf("org_name: %q", resp.OrganizationName)
	}
	if len(resp.Media) != 1 {
		t.Errorf("media len: got %d", len(resp.Media))
	}
	if resp.Media[0].URL != "https://cdn/img.jpg" {
		t.Errorf("media.url: %q", resp.Media[0].URL)
	}
	if len(resp.Manejos) != 1 {
		t.Errorf("manejos len: got %d", len(resp.Manejos))
	}
	if resp.Manejos[0].Description != "Poda de formação" {
		t.Errorf("manejo.description: %q", resp.Manejos[0].Description)
	}
	if len(resp.Monitoramentos) != 1 {
		t.Errorf("monitoramentos len: got %d", len(resp.Monitoramentos))
	}
	if resp.Monitoramentos[0].HealthStatus != "healthy" {
		t.Errorf("monitoramento.health_status: %q", resp.Monitoramentos[0].HealthStatus)
	}
}

func TestGetAsset_NotFound(t *testing.T) {
	repo := &mockRepo{assetDetail: nil}
	svc := newSvc(repo, &mockSigner{})

	_, err := svc.GetAsset(context.Background(), "a-999")
	if err == nil {
		t.Fatal("esperava erro 404")
	}
	appErr, ok := err.(*apperror.AppError)
	if !ok || appErr.Status != 404 {
		t.Errorf("esperava 404, got %v", err)
	}
}

func TestGetAsset_WithManejoMediaURLs(t *testing.T) {
	bKey := "before.jpg"
	bBucket := "bucket"
	aKey := "after.jpg"
	aBucket := "bucket"
	repo := &mockRepo{
		assetDetail: &public.AssetDetailRow{ID: "a-1", TypeName: "Árvore"},
		manejos: []public.ManejoRow{
			{
				ID:              "man-1",
				Description:     "Poda",
				BeforeStorageKey: &bKey,
				BeforeBucket:    &bBucket,
				AfterStorageKey: &aKey,
				AfterBucket:     &aBucket,
				CreatedAt:       time.Now(),
			},
		},
	}
	svc := newSvc(repo, &mockSigner{url: "https://cdn/url"})

	resp, err := svc.GetAsset(context.Background(), "a-1")
	if err != nil {
		t.Fatalf("erro: %v", err)
	}
	if len(resp.Manejos) != 1 {
		t.Fatalf("manejos len: %d", len(resp.Manejos))
	}
	m := resp.Manejos[0]
	if m.BeforeMediaURL == nil {
		t.Error("before_media_url deveria estar preenchido")
	}
	if m.AfterMediaURL == nil {
		t.Error("after_media_url deveria estar preenchido")
	}
}

// --- ResolveQR ---

func TestResolveQR_Available(t *testing.T) {
	id := "a-1"
	repo := &mockRepo{qrAssetID: &id}
	svc := newSvc(repo, &mockSigner{})

	resp, err := svc.ResolveQR(context.Background(), "https://app.eco/a/xyz")
	if err != nil {
		t.Fatalf("erro: %v", err)
	}
	if !resp.IsAvailable {
		t.Error("is_available deveria ser true")
	}
	if resp.AssetID == nil || *resp.AssetID != "a-1" {
		t.Errorf("asset_id: %v", resp.AssetID)
	}
}

func TestResolveQR_NotAvailable(t *testing.T) {
	repo := &mockRepo{qrAssetID: nil}
	svc := newSvc(repo, &mockSigner{})

	resp, err := svc.ResolveQR(context.Background(), "https://app.eco/a/notexist")
	if err != nil {
		t.Fatalf("erro: %v", err)
	}
	if resp.IsAvailable {
		t.Error("is_available deveria ser false")
	}
	if resp.AssetID != nil {
		t.Errorf("asset_id deveria ser nil, got %v", resp.AssetID)
	}
}

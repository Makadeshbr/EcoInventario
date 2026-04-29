package asset_test

import (
	"context"
	"testing"

	"github.com/allan/ecoinventario/internal/asset"
	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// --- mocks ---

type mockRepo struct {
	stored          *asset.Asset
	findErr         error
	findByQR        *asset.Asset
	insertCalls     int
	insertedAssets  []*asset.Asset
	insertErr       error
	updateErr       error
	updateCalls     int
	updateStatusErr error
	statusCalls     int
	softDeleteErr   error
	softDeleteCalls int
	listResult      []*asset.Asset
	nearbyResult    []*asset.Asset
	nearbyArgs      asset.NearbyParams
	history         []asset.HistoryEntry
}

func (m *mockRepo) FindByID(_ context.Context, _, _ string) (*asset.Asset, error) {
	return m.stored, m.findErr
}

func (m *mockRepo) FindByQRCode(_ context.Context, _ string) (*asset.Asset, error) {
	return m.findByQR, nil
}

func (m *mockRepo) Insert(_ context.Context, a *asset.Asset) error {
	m.insertCalls++
	if m.insertErr != nil {
		return m.insertErr
	}
	if a.ID == "" {
		a.ID = "new-asset-id"
	}
	m.insertedAssets = append(m.insertedAssets, a)
	// Simula o comportamento do DB: registro recém-inserido fica visível para FindByID.
	// Copia para evitar aliasing com slices de inserted (o service pode mutar depois).
	cp := *a
	m.stored = &cp
	return nil
}

func (m *mockRepo) Update(_ context.Context, _ *asset.Asset) error {
	m.updateCalls++
	return m.updateErr
}

func (m *mockRepo) UpdateStatus(_ context.Context, _ *asset.Asset) error {
	m.statusCalls++
	return m.updateStatusErr
}

func (m *mockRepo) SoftDelete(_ context.Context, _, _ string) error {
	m.softDeleteCalls++
	return m.softDeleteErr
}

func (m *mockRepo) List(_ context.Context, _ asset.ListFilters) ([]*asset.Asset, error) {
	return m.listResult, nil
}

func (m *mockRepo) Nearby(_ context.Context, p asset.NearbyParams) ([]*asset.Asset, error) {
	m.nearbyArgs = p
	return m.nearbyResult, nil
}

func (m *mockRepo) History(_ context.Context, _, _ string) ([]asset.HistoryEntry, error) {
	return m.history, nil
}

type mockTypeChecker struct {
	exists bool
}

func (m *mockTypeChecker) ExistsInOrg(_ context.Context, _, _ string) (bool, error) {
	return m.exists, nil
}

type mockMediaChecker struct {
	hasMedia bool
}

func (m *mockMediaChecker) HasUploadedMedia(_ context.Context, _ string) (bool, error) {
	return m.hasMedia, nil
}

type noopAuditRepo struct{}

func (n *noopAuditRepo) Insert(_ context.Context, _ *audit.LogEntry) error { return nil }

func newSvc(repo asset.Repository, types asset.AssetTypeChecker) *asset.Service {
	auditSvc := audit.NewService(&noopAuditRepo{})
	// Default: possui mídia — não bloqueia submit nos testes existentes.
	// Os testes que exercitam a regra de mídia usam newSvcWithMedia.
	return asset.NewService(repo, types, &mockMediaChecker{hasMedia: true}, auditSvc)
}

func newSvcWithMedia(repo asset.Repository, types asset.AssetTypeChecker, media asset.MediaChecker) *asset.Service {
	return asset.NewService(repo, types, media, audit.NewService(&noopAuditRepo{}))
}

func techCtx(userID, orgID string) context.Context {
	ctx := shared.WithOrgID(context.Background(), orgID)
	ctx = shared.WithUserID(ctx, userID)
	return shared.WithRole(ctx, shared.RoleTech)
}

func adminCtx(userID, orgID string) context.Context {
	ctx := shared.WithOrgID(context.Background(), orgID)
	ctx = shared.WithUserID(ctx, userID)
	return shared.WithRole(ctx, shared.RoleAdmin)
}

func viewerCtx(orgID string) context.Context {
	ctx := shared.WithOrgID(context.Background(), orgID)
	ctx = shared.WithUserID(ctx, "viewer-id")
	return shared.WithRole(ctx, shared.RoleViewer)
}

// --- Create ---

func TestCreate(t *testing.T) {
	ctx := techCtx("tech-1", "org-1")

	t.Run("cria asset em status draft com version 1", func(t *testing.T) {
		repo := &mockRepo{}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		resp, err := svc.Create(ctx, asset.CreateRequest{
			AssetTypeID: "11111111-1111-1111-1111-111111111111",
			Latitude:    -23.5505,
			Longitude:   -46.6333,
			QRCode:      "https://app.eco/a/abc",
		})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp == nil {
			t.Fatal("esperava response")
		}
		if len(repo.insertedAssets) != 1 {
			t.Fatalf("insert chamado %d vezes", len(repo.insertedAssets))
		}
		inserted := repo.insertedAssets[0]
		if inserted.Status != shared.StatusDraft {
			t.Errorf("status: got %q, want draft", inserted.Status)
		}
		if inserted.Version != 1 {
			t.Errorf("version: got %d, want 1", inserted.Version)
		}
		if inserted.CreatedBy != "tech-1" {
			t.Errorf("created_by: got %q", inserted.CreatedBy)
		}
	})

	t.Run("preserva ID enviado pelo cliente no sync offline", func(t *testing.T) {
		repo := &mockRepo{}
		svc := newSvc(repo, &mockTypeChecker{exists: true})
		clientID := "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"

		resp, err := svc.Create(ctx, asset.CreateRequest{
			ID:          &clientID,
			AssetTypeID: "11111111-1111-1111-1111-111111111111",
			Latitude:    -23.5505,
			Longitude:   -46.6333,
			QRCode:      "offline-client-id",
		})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp.ID != clientID {
			t.Fatalf("id: got %q, want %q", resp.ID, clientID)
		}
		if repo.insertedAssets[0].ID != clientID {
			t.Fatalf("inserted id: got %q", repo.insertedAssets[0].ID)
		}
	})

	t.Run("qr_code duplicado retorna 409", func(t *testing.T) {
		repo := &mockRepo{findByQR: &asset.Asset{ID: "existing"}}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		_, err := svc.Create(ctx, asset.CreateRequest{
			AssetTypeID: "11111111-1111-1111-1111-111111111111",
			Latitude:    0,
			Longitude:   0,
			QRCode:      "dup",
		})
		assertStatus(t, err, 409)
	})

	t.Run("asset_type inexistente na org retorna 400", func(t *testing.T) {
		repo := &mockRepo{}
		svc := newSvc(repo, &mockTypeChecker{exists: false})

		_, err := svc.Create(ctx, asset.CreateRequest{
			AssetTypeID: "22222222-2222-2222-2222-222222222222",
			QRCode:      "x",
		})
		assertStatus(t, err, 400)
	})
}

// --- Update ---

func TestUpdate(t *testing.T) {
	t.Run("TECH edita próprio asset draft — in-place", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", OrganizationID: "org-1", CreatedBy: "tech-1", Status: shared.StatusDraft, AssetTypeID: "at-1"}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		lat := -23.55
		_, created, err := svc.Update(techCtx("tech-1", "org-1"), "a-1", asset.UpdateRequest{Latitude: &lat})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if created {
			t.Error("esperava in-place (created=false)")
		}
		if repo.updateCalls != 1 {
			t.Errorf("Update calls: got %d", repo.updateCalls)
		}
	})

	t.Run("TECH edita asset rejected próprio — in-place mantém status", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", OrganizationID: "org-1", CreatedBy: "tech-1", Status: shared.StatusRejected}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		notes := "corrigido"
		_, created, err := svc.Update(techCtx("tech-1", "org-1"), "a-1", asset.UpdateRequest{Notes: &notes})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if created {
			t.Error("esperava in-place")
		}
	})

	t.Run("TECH não pode editar asset de outro — 403", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", CreatedBy: "outro-tech", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		notes := "x"
		_, _, err := svc.Update(techCtx("tech-1", "org-1"), "a-1", asset.UpdateRequest{Notes: &notes})
		assertStatus(t, err, 403)
	})

	t.Run("TECH não pode editar asset approved — 403", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", CreatedBy: "tech-1", Status: shared.StatusApproved, Version: 1}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		notes := "x"
		_, _, err := svc.Update(techCtx("tech-1", "org-1"), "a-1", asset.UpdateRequest{Notes: &notes})
		assertStatus(t, err, 403)
	})

	t.Run("Update em status pending retorna 409", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", CreatedBy: "tech-1", Status: shared.StatusPending}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		notes := "x"
		_, _, err := svc.Update(techCtx("tech-1", "org-1"), "a-1", asset.UpdateRequest{Notes: &notes})
		assertStatus(t, err, 409)
	})

	t.Run("ADMIN edita asset approved — cria nova versão com parent_id", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", OrganizationID: "org-1", CreatedBy: "tech-1", Status: shared.StatusApproved, Version: 1, AssetTypeID: "at-1", QRCode: "qr-1"}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		notes := "nova nota"
		resp, created, err := svc.Update(adminCtx("admin-1", "org-1"), "a-1", asset.UpdateRequest{Notes: &notes})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if !created {
			t.Fatal("esperava created=true (nova versão)")
		}
		if len(repo.insertedAssets) != 1 {
			t.Fatalf("esperava 1 insert, got %d", len(repo.insertedAssets))
		}
		novo := repo.insertedAssets[0]
		if novo.ParentID == nil || *novo.ParentID != "a-1" {
			t.Errorf("parent_id: %+v", novo.ParentID)
		}
		if novo.Version != 2 {
			t.Errorf("version: got %d, want 2", novo.Version)
		}
		if novo.Status != shared.StatusDraft {
			t.Errorf("status: got %q, want draft", novo.Status)
		}
		if resp.Version != 2 {
			t.Errorf("resp.Version: got %d", resp.Version)
		}
	})

	t.Run("asset inexistente retorna 404", func(t *testing.T) {
		repo := &mockRepo{stored: nil}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		notes := "x"
		_, _, err := svc.Update(adminCtx("admin-1", "org-1"), "a-1", asset.UpdateRequest{Notes: &notes})
		assertStatus(t, err, 404)
	})
}

// --- Delete ---

func TestSoftDelete(t *testing.T) {
	t.Run("TECH deleta próprio draft — ok", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", CreatedBy: "tech-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		if err := svc.SoftDelete(techCtx("tech-1", "org-1"), "a-1"); err != nil {
			t.Fatalf("erro: %v", err)
		}
		if repo.softDeleteCalls != 1 {
			t.Errorf("soft delete calls: got %d", repo.softDeleteCalls)
		}
	})

	t.Run("TECH não pode deletar asset de outro — 403", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", CreatedBy: "outro", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		err := svc.SoftDelete(techCtx("tech-1", "org-1"), "a-1")
		assertStatus(t, err, 403)
	})

	t.Run("não pode deletar asset fora de draft — 422", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", CreatedBy: "tech-1", Status: shared.StatusPending}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		err := svc.SoftDelete(techCtx("tech-1", "org-1"), "a-1")
		assertStatus(t, err, 422)
	})
}

// --- Submit / Approve / Reject ---

func TestSubmit(t *testing.T) {
	t.Run("draft → pending com sucesso", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", CreatedBy: "tech-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		resp, err := svc.Submit(techCtx("tech-1", "org-1"), "a-1")
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if resp.Status != shared.StatusPending {
			t.Errorf("status: got %q", resp.Status)
		}
	})

	t.Run("submit em status não-draft retorna 409", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", CreatedBy: "tech-1", Status: shared.StatusApproved}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		_, err := svc.Submit(techCtx("tech-1", "org-1"), "a-1")
		assertStatus(t, err, 409)
	})

	t.Run("TECH não pode submeter asset de outro — 403", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", CreatedBy: "outro", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		_, err := svc.Submit(techCtx("tech-1", "org-1"), "a-1")
		assertStatus(t, err, 403)
	})

	t.Run("submit sem mídia uploaded retorna 422", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", CreatedBy: "tech-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvcWithMedia(repo, &mockTypeChecker{exists: true}, &mockMediaChecker{hasMedia: false})

		_, err := svc.Submit(techCtx("tech-1", "org-1"), "a-1")
		assertStatus(t, err, 422)
	})
}

func TestApprove(t *testing.T) {
	t.Run("pending → approved preenche approved_by", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", Status: shared.StatusPending}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		resp, err := svc.Approve(adminCtx("admin-1", "org-1"), "a-1")
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if resp.Status != shared.StatusApproved {
			t.Errorf("status: got %q", resp.Status)
		}
		if resp.ApprovedBy == nil || *resp.ApprovedBy != "admin-1" {
			t.Errorf("approved_by: %+v", resp.ApprovedBy)
		}
	})

	t.Run("approve em status não-pending retorna 409", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		_, err := svc.Approve(adminCtx("admin-1", "org-1"), "a-1")
		assertStatus(t, err, 409)
	})
}

func TestReject(t *testing.T) {
	t.Run("pending → rejected com motivo", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", Status: shared.StatusPending}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		resp, err := svc.Reject(adminCtx("admin-1", "org-1"), "a-1", asset.RejectRequest{Reason: "foto desfocada"})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if resp.Status != shared.StatusRejected {
			t.Errorf("status: got %q", resp.Status)
		}
		if resp.RejectionReason != "foto desfocada" {
			t.Errorf("reason: got %q", resp.RejectionReason)
		}
	})

	t.Run("reject em status não-pending retorna 409", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", Status: shared.StatusApproved}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		_, err := svc.Reject(adminCtx("admin-1", "org-1"), "a-1", asset.RejectRequest{Reason: "x"})
		assertStatus(t, err, 409)
	})
}

// --- Viewer visibility ---

func TestGetByIDViewer(t *testing.T) {
	t.Run("viewer vê apenas approved", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", Status: shared.StatusPending}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		_, err := svc.GetByID(viewerCtx("org-1"), "a-1")
		assertStatus(t, err, 404)
	})

	t.Run("viewer enxerga asset approved", func(t *testing.T) {
		existing := &asset.Asset{ID: "a-1", Status: shared.StatusApproved}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		resp, err := svc.GetByID(viewerCtx("org-1"), "a-1")
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if resp.ID != "a-1" {
			t.Errorf("id: %q", resp.ID)
		}
	})
}

// --- List ---

func TestList(t *testing.T) {
	ctx := adminCtx("admin-1", "org-1")

	t.Run("retorna paginado", func(t *testing.T) {
		repo := &mockRepo{listResult: []*asset.Asset{
			{ID: "a-1", Status: shared.StatusDraft, AssetTypeID: "at-1", CreatedBy: "u-1"},
			{ID: "a-2", Status: shared.StatusApproved, AssetTypeID: "at-1", CreatedBy: "u-1"},
		}}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		result, err := svc.List(ctx, asset.ListFilters{Limit: 20})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if len(result.Data) != 2 {
			t.Errorf("len: got %d", len(result.Data))
		}
	})
}

// --- Nearby ---

func TestNearby(t *testing.T) {
	ctx := techCtx("tech-1", "org-1")

	t.Run("chama repo com params normalizados", func(t *testing.T) {
		dist := 42.0
		repo := &mockRepo{nearbyResult: []*asset.Asset{
			{ID: "a-1", Status: shared.StatusApproved, DistanceM: &dist},
		}}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		result, err := svc.Nearby(ctx, asset.NearbyParams{Lat: -23.5, Lng: -46.6, RadiusM: 1000, Limit: 10})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if len(result) != 1 {
			t.Fatalf("len: got %d", len(result))
		}
		if result[0].DistanceM == nil || *result[0].DistanceM != 42.0 {
			t.Errorf("distance: %+v", result[0].DistanceM)
		}
	})

	t.Run("limit/radius zero usam defaults", func(t *testing.T) {
		repo := &mockRepo{nearbyResult: nil}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		_, _ = svc.Nearby(ctx, asset.NearbyParams{Lat: 0, Lng: 0})
		if repo.nearbyArgs.RadiusM != 5000 {
			t.Errorf("radius default: got %d", repo.nearbyArgs.RadiusM)
		}
		if repo.nearbyArgs.Limit != 20 {
			t.Errorf("limit default: got %d", repo.nearbyArgs.Limit)
		}
	})

	t.Run("radius maior que 50000 é clampado", func(t *testing.T) {
		repo := &mockRepo{}
		svc := newSvc(repo, &mockTypeChecker{exists: true})
		_, _ = svc.Nearby(ctx, asset.NearbyParams{RadiusM: 9_999_999, Limit: 50})
		if repo.nearbyArgs.RadiusM != 50000 {
			t.Errorf("radius clamp: got %d", repo.nearbyArgs.RadiusM)
		}
	})
}

// --- History ---

func TestHistory(t *testing.T) {
	ctx := adminCtx("admin-1", "org-1")

	t.Run("retorna cadeia de versões", func(t *testing.T) {
		repo := &mockRepo{
			stored: &asset.Asset{ID: "a-1", Status: shared.StatusApproved},
			history: []asset.HistoryEntry{
				{ID: "a-1", Version: 1, Status: shared.StatusApproved},
				{ID: "a-2", Version: 2, Status: shared.StatusDraft},
			},
		}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		h, err := svc.History(ctx, "a-1")
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if len(h) != 2 {
			t.Errorf("len: got %d", len(h))
		}
	})

	t.Run("viewer não vê histórico de asset não-approved", func(t *testing.T) {
		repo := &mockRepo{stored: &asset.Asset{ID: "a-1", Status: shared.StatusDraft}}
		svc := newSvc(repo, &mockTypeChecker{exists: true})

		_, err := svc.History(viewerCtx("org-1"), "a-1")
		assertStatus(t, err, 404)
	})
}

// --- helpers ---

func assertStatus(t *testing.T, err error, want int) {
	t.Helper()
	if err == nil {
		t.Fatal("esperava erro, got nil")
	}
	appErr, ok := err.(*apperror.AppError)
	if !ok {
		t.Fatalf("esperava *apperror.AppError, got %T: %v", err, err)
	}
	if appErr.Status != want {
		t.Errorf("status: got %d, want %d", appErr.Status, want)
	}
}

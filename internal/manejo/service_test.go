package manejo_test

import (
	"context"
	"testing"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/manejo"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// --- mocks ---

type mockRepo struct {
	stored        *manejo.Manejo
	findErr       error
	insertCalls   int
	insertedItems []*manejo.Manejo
	insertErr     error
	updateErr     error
	updateCalls   int
	statusErr     error
	statusCalls   int
	deleteErr     error
	deleteCalls   int
	listResult    []*manejo.Manejo
	listFilters   manejo.ListFilters
}

func (m *mockRepo) FindByID(_ context.Context, _, _ string) (*manejo.Manejo, error) {
	return m.stored, m.findErr
}

func (m *mockRepo) Insert(_ context.Context, item *manejo.Manejo) error {
	m.insertCalls++
	if m.insertErr != nil {
		return m.insertErr
	}
	item.ID = "new-manejo-id"
	cp := *item
	m.insertedItems = append(m.insertedItems, &cp)
	m.stored = &cp
	return nil
}

func (m *mockRepo) Update(_ context.Context, _ *manejo.Manejo) error {
	m.updateCalls++
	return m.updateErr
}

func (m *mockRepo) UpdateStatus(_ context.Context, _ *manejo.Manejo) error {
	m.statusCalls++
	return m.statusErr
}

func (m *mockRepo) SoftDelete(_ context.Context, _, _ string) error {
	m.deleteCalls++
	return m.deleteErr
}

func (m *mockRepo) List(_ context.Context, filters manejo.ListFilters) ([]*manejo.Manejo, error) {
	m.listFilters = filters
	return m.listResult, nil
}

type mockAsset struct{ exists bool }

func (m *mockAsset) ExistsInOrg(_ context.Context, _, _ string) (bool, error) {
	return m.exists, nil
}

type mockMedia struct{ belongs bool }

func (m *mockMedia) BelongsToAsset(_ context.Context, _, _, _ string) (bool, error) {
	return m.belongs, nil
}

type noopAuditRepo struct{}

func (n *noopAuditRepo) Insert(_ context.Context, _ *audit.LogEntry) error { return nil }

func (n *noopAuditRepo) List(_ context.Context, _ string, _ audit.ListFilters) ([]*audit.LogEntry, error) {
	return nil, nil
}

func newSvc(repo manejo.Repository) *manejo.Service {
	return manejo.NewService(repo, &mockAsset{exists: true}, &mockMedia{belongs: true}, audit.NewService(&noopAuditRepo{}))
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

	t.Run("cria manejo em status draft", func(t *testing.T) {
		repo := &mockRepo{}
		svc := newSvc(repo)

		resp, err := svc.Create(ctx, manejo.CreateRequest{
			AssetID:     "asset-1",
			Description: "Poda de formação",
		})
		if err != nil {
			t.Fatalf("erro inesperado: %v", err)
		}
		if resp == nil {
			t.Fatal("esperava response")
		}
		if len(repo.insertedItems) != 1 {
			t.Fatalf("insert chamado %d vezes", len(repo.insertedItems))
		}
		inserted := repo.insertedItems[0]
		if inserted.Status != shared.StatusDraft {
			t.Errorf("status: got %q, want draft", inserted.Status)
		}
		if inserted.CreatedBy != "tech-1" {
			t.Errorf("created_by: got %q", inserted.CreatedBy)
		}
	})

	t.Run("asset inexistente na org retorna 400", func(t *testing.T) {
		repo := &mockRepo{}
		svc := manejo.NewService(repo, &mockAsset{exists: false}, &mockMedia{belongs: true}, audit.NewService(&noopAuditRepo{}))

		_, err := svc.Create(ctx, manejo.CreateRequest{
			AssetID:     "asset-999",
			Description: "test",
		})
		assertStatus(t, err, 400)
	})

	t.Run("before_media_id de outro asset retorna 422", func(t *testing.T) {
		repo := &mockRepo{}
		mediaID := "media-outro"
		svc := manejo.NewService(repo, &mockAsset{exists: true}, &mockMedia{belongs: false}, audit.NewService(&noopAuditRepo{}))

		_, err := svc.Create(ctx, manejo.CreateRequest{
			AssetID:       "asset-1",
			Description:   "test",
			BeforeMediaID: &mediaID,
		})
		assertStatus(t, err, 422)
	})

	t.Run("after_media_id de outro asset retorna 422", func(t *testing.T) {
		repo := &mockRepo{}
		mediaID := "media-outro"
		svc := manejo.NewService(repo, &mockAsset{exists: true}, &mockMedia{belongs: false}, audit.NewService(&noopAuditRepo{}))

		_, err := svc.Create(ctx, manejo.CreateRequest{
			AssetID:      "asset-1",
			Description:  "test",
			AfterMediaID: &mediaID,
		})
		assertStatus(t, err, 422)
	})
}

// --- Update ---

func TestUpdate(t *testing.T) {
	t.Run("TECH edita próprio manejo draft — in-place", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", OrganizationID: "org-1", CreatedBy: "tech-1", Status: shared.StatusDraft, AssetID: "asset-1"}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		desc := "nova desc"
		_, err := svc.Update(techCtx("tech-1", "org-1"), "m-1", manejo.UpdateRequest{Description: &desc})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if repo.updateCalls != 1 {
			t.Errorf("update calls: got %d", repo.updateCalls)
		}
	})

	t.Run("TECH edita próprio manejo rejected — in-place", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", OrganizationID: "org-1", CreatedBy: "tech-1", Status: shared.StatusRejected, AssetID: "asset-1"}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		desc := "corrigido"
		_, err := svc.Update(techCtx("tech-1", "org-1"), "m-1", manejo.UpdateRequest{Description: &desc})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
	})

	t.Run("TECH não pode editar manejo de outro — 403", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "outro-tech", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		desc := "x"
		_, err := svc.Update(techCtx("tech-1", "org-1"), "m-1", manejo.UpdateRequest{Description: &desc})
		assertStatus(t, err, 403)
	})

	t.Run("manejo pending é imutável — 409", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "tech-1", Status: shared.StatusPending}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		desc := "x"
		_, err := svc.Update(techCtx("tech-1", "org-1"), "m-1", manejo.UpdateRequest{Description: &desc})
		assertStatus(t, err, 409)
	})

	t.Run("manejo approved é imutável — 409", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "tech-1", Status: shared.StatusApproved}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		desc := "x"
		_, err := svc.Update(techCtx("tech-1", "org-1"), "m-1", manejo.UpdateRequest{Description: &desc})
		assertStatus(t, err, 409)
	})

	t.Run("before_media_id de outro asset retorna 422", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "tech-1", Status: shared.StatusDraft, AssetID: "asset-1"}
		repo := &mockRepo{stored: existing}
		mediaID := "media-outro"
		svc := manejo.NewService(repo, &mockAsset{exists: true}, &mockMedia{belongs: false}, audit.NewService(&noopAuditRepo{}))

		_, err := svc.Update(techCtx("tech-1", "org-1"), "m-1", manejo.UpdateRequest{BeforeMediaID: &mediaID})
		assertStatus(t, err, 422)
	})

	t.Run("manejo inexistente retorna 404", func(t *testing.T) {
		repo := &mockRepo{stored: nil}
		svc := newSvc(repo)

		desc := "x"
		_, err := svc.Update(techCtx("tech-1", "org-1"), "m-1", manejo.UpdateRequest{Description: &desc})
		assertStatus(t, err, 404)
	})
}

// --- SoftDelete ---

func TestSoftDelete(t *testing.T) {
	t.Run("TECH deleta próprio draft — ok", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "tech-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		if err := svc.SoftDelete(techCtx("tech-1", "org-1"), "m-1"); err != nil {
			t.Fatalf("erro: %v", err)
		}
		if repo.deleteCalls != 1 {
			t.Errorf("delete calls: got %d", repo.deleteCalls)
		}
	})

	t.Run("não pode deletar fora de draft — 422", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "tech-1", Status: shared.StatusApproved}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		err := svc.SoftDelete(techCtx("tech-1", "org-1"), "m-1")
		assertStatus(t, err, 422)
	})

	t.Run("TECH não pode deletar de outro — 403", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "outro", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		err := svc.SoftDelete(techCtx("tech-1", "org-1"), "m-1")
		assertStatus(t, err, 403)
	})

	t.Run("ADMIN pode deletar de qualquer tech — ok", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "tech-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		if err := svc.SoftDelete(adminCtx("admin-1", "org-1"), "m-1"); err != nil {
			t.Fatalf("erro: %v", err)
		}
	})
}

// --- Submit ---

func TestSubmit(t *testing.T) {
	t.Run("draft → pending", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "tech-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		resp, err := svc.Submit(techCtx("tech-1", "org-1"), "m-1")
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if resp.Status != shared.StatusPending {
			t.Errorf("status: got %q", resp.Status)
		}
	})

	t.Run("não-draft retorna 409", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "tech-1", Status: shared.StatusApproved}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		_, err := svc.Submit(techCtx("tech-1", "org-1"), "m-1")
		assertStatus(t, err, 409)
	})

	t.Run("TECH não pode submeter de outro — 403", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", CreatedBy: "outro", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		_, err := svc.Submit(techCtx("tech-1", "org-1"), "m-1")
		assertStatus(t, err, 403)
	})
}

// --- Approve ---

func TestApprove(t *testing.T) {
	t.Run("pending → approved preenche approved_by", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", Status: shared.StatusPending}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		resp, err := svc.Approve(adminCtx("admin-1", "org-1"), "m-1")
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

	t.Run("não-pending retorna 409", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		_, err := svc.Approve(adminCtx("admin-1", "org-1"), "m-1")
		assertStatus(t, err, 409)
	})
}

// --- Reject ---

func TestReject(t *testing.T) {
	t.Run("pending → rejected com motivo", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", Status: shared.StatusPending}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		resp, err := svc.Reject(adminCtx("admin-1", "org-1"), "m-1", manejo.RejectRequest{Reason: "fotos ruins"})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if resp.Status != shared.StatusRejected {
			t.Errorf("status: got %q", resp.Status)
		}
		if resp.RejectionReason != "fotos ruins" {
			t.Errorf("reason: got %q", resp.RejectionReason)
		}
	})

	t.Run("não-pending retorna 409", func(t *testing.T) {
		existing := &manejo.Manejo{ID: "m-1", Status: shared.StatusApproved}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		_, err := svc.Reject(adminCtx("admin-1", "org-1"), "m-1", manejo.RejectRequest{Reason: "x"})
		assertStatus(t, err, 409)
	})
}

// --- List ---

func TestList(t *testing.T) {
	t.Run("retorna resultados paginados", func(t *testing.T) {
		repo := &mockRepo{listResult: []*manejo.Manejo{
			{ID: "m-1", Status: shared.StatusDraft, CreatedBy: "u-1", AssetID: "a-1"},
			{ID: "m-2", Status: shared.StatusApproved, CreatedBy: "u-1", AssetID: "a-1"},
		}}
		svc := newSvc(repo)

		result, err := svc.List(adminCtx("admin-1", "org-1"), manejo.ListFilters{AssetID: "a-1", Limit: 20})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if len(result.Data) != 2 {
			t.Errorf("len: got %d", len(result.Data))
		}
	})

	t.Run("propaga filtros operacionais para o repositorio", func(t *testing.T) {
		repo := &mockRepo{listResult: []*manejo.Manejo{}}
		svc := newSvc(repo)

		_, err := svc.List(adminCtx("admin-1", "org-1"), manejo.ListFilters{
			AssetID:     "a-1",
			Status:      shared.StatusPending,
			CreatedBy:   "tech-1",
			CreatedFrom: "2026-05-03",
			CreatedTo:   "2026-05-03",
			Cursor:      "m-0",
			Limit:       20,
		})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if repo.listFilters.OrgID != "org-1" || repo.listFilters.AssetID != "a-1" {
			t.Fatalf("filtros base: %+v", repo.listFilters)
		}
		if repo.listFilters.Status != shared.StatusPending || repo.listFilters.CreatedBy != "tech-1" {
			t.Fatalf("filtros operacionais: %+v", repo.listFilters)
		}
		if repo.listFilters.CreatedFrom != "2026-05-03" || repo.listFilters.CreatedTo != "2026-05-03" {
			t.Fatalf("filtro de data: %+v", repo.listFilters)
		}
		if repo.listFilters.Cursor != "m-0" || repo.listFilters.Limit != 21 {
			t.Fatalf("paginacao: %+v", repo.listFilters)
		}
	})
}

// --- GetByID ---

func TestGetByID(t *testing.T) {
	t.Run("viewer não vê não-approved — 404", func(t *testing.T) {
		repo := &mockRepo{stored: &manejo.Manejo{ID: "m-1", Status: shared.StatusPending}}
		svc := newSvc(repo)

		_, err := svc.GetByID(viewerCtx("org-1"), "m-1")
		assertStatus(t, err, 404)
	})

	t.Run("viewer vê approved", func(t *testing.T) {
		repo := &mockRepo{stored: &manejo.Manejo{ID: "m-1", Status: shared.StatusApproved}}
		svc := newSvc(repo)

		resp, err := svc.GetByID(viewerCtx("org-1"), "m-1")
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if resp.ID != "m-1" {
			t.Errorf("id: %q", resp.ID)
		}
	})

	t.Run("não encontrado retorna 404", func(t *testing.T) {
		repo := &mockRepo{stored: nil}
		svc := newSvc(repo)

		_, err := svc.GetByID(adminCtx("admin-1", "org-1"), "m-1")
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

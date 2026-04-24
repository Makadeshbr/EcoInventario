package monitoramento_test

import (
	"context"
	"testing"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/monitoramento"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// --- mocks ---

type mockRepo struct {
	stored        *monitoramento.Monitoramento
	findErr       error
	insertCalls   int
	insertedItems []*monitoramento.Monitoramento
	insertErr     error
	updateErr     error
	updateCalls   int
	statusErr     error
	statusCalls   int
	deleteErr     error
	deleteCalls   int
	listResult    []*monitoramento.Monitoramento
}

func (m *mockRepo) FindByID(_ context.Context, _, _ string) (*monitoramento.Monitoramento, error) {
	return m.stored, m.findErr
}

func (m *mockRepo) Insert(_ context.Context, item *monitoramento.Monitoramento) error {
	m.insertCalls++
	if m.insertErr != nil {
		return m.insertErr
	}
	item.ID = "new-mon-id"
	cp := *item
	m.insertedItems = append(m.insertedItems, &cp)
	m.stored = &cp
	return nil
}

func (m *mockRepo) Update(_ context.Context, _ *monitoramento.Monitoramento) error {
	m.updateCalls++
	return m.updateErr
}

func (m *mockRepo) UpdateStatus(_ context.Context, _ *monitoramento.Monitoramento) error {
	m.statusCalls++
	return m.statusErr
}

func (m *mockRepo) SoftDelete(_ context.Context, _, _ string) error {
	m.deleteCalls++
	return m.deleteErr
}

func (m *mockRepo) List(_ context.Context, _ monitoramento.ListFilters) ([]*monitoramento.Monitoramento, error) {
	return m.listResult, nil
}

type mockAsset struct{ exists bool }

func (m *mockAsset) ExistsInOrg(_ context.Context, _, _ string) (bool, error) {
	return m.exists, nil
}

type noopAuditRepo struct{}

func (n *noopAuditRepo) Insert(_ context.Context, _ *audit.LogEntry) error { return nil }

func newSvc(repo monitoramento.Repository) *monitoramento.Service {
	return monitoramento.NewService(repo, &mockAsset{exists: true}, audit.NewService(&noopAuditRepo{}))
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

	t.Run("cria monitoramento em status draft", func(t *testing.T) {
		repo := &mockRepo{}
		svc := newSvc(repo)

		resp, err := svc.Create(ctx, monitoramento.CreateRequest{
			AssetID:      "asset-1",
			Notes:        "Folhas amareladas",
			HealthStatus: shared.HealthWarning,
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
		if inserted.HealthStatus != shared.HealthWarning {
			t.Errorf("health_status: got %q", inserted.HealthStatus)
		}
		if inserted.CreatedBy != "tech-1" {
			t.Errorf("created_by: got %q", inserted.CreatedBy)
		}
	})

	t.Run("health_status inválido retorna 400", func(t *testing.T) {
		repo := &mockRepo{}
		svc := newSvc(repo)

		_, err := svc.Create(ctx, monitoramento.CreateRequest{
			AssetID:      "asset-1",
			Notes:        "Notas",
			HealthStatus: "invalido",
		})
		assertStatus(t, err, 400)
	})

	t.Run("asset inexistente na org retorna 400", func(t *testing.T) {
		repo := &mockRepo{}
		svc := monitoramento.NewService(repo, &mockAsset{exists: false}, audit.NewService(&noopAuditRepo{}))

		_, err := svc.Create(ctx, monitoramento.CreateRequest{
			AssetID:      "asset-999",
			Notes:        "test",
			HealthStatus: shared.HealthHealthy,
		})
		assertStatus(t, err, 400)
	})
}

// --- Update ---

func TestUpdate(t *testing.T) {
	t.Run("TECH edita próprio monitoramento draft — in-place", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{
			ID: "mon-1", OrganizationID: "org-1", CreatedBy: "tech-1",
			Status: shared.StatusDraft, AssetID: "asset-1", HealthStatus: shared.HealthHealthy,
		}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		hs := shared.HealthWarning
		_, err := svc.Update(techCtx("tech-1", "org-1"), "mon-1", monitoramento.UpdateRequest{HealthStatus: &hs})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if repo.updateCalls != 1 {
			t.Errorf("update calls: got %d", repo.updateCalls)
		}
	})

	t.Run("TECH não pode editar de outro — 403", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{
			ID: "mon-1", CreatedBy: "outro", Status: shared.StatusDraft,
		}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		notes := "x"
		_, err := svc.Update(techCtx("tech-1", "org-1"), "mon-1", monitoramento.UpdateRequest{Notes: &notes})
		assertStatus(t, err, 403)
	})

	t.Run("monitoramento pending é imutável — 409", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{
			ID: "mon-1", CreatedBy: "tech-1", Status: shared.StatusPending,
		}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		notes := "x"
		_, err := svc.Update(techCtx("tech-1", "org-1"), "mon-1", monitoramento.UpdateRequest{Notes: &notes})
		assertStatus(t, err, 409)
	})

	t.Run("monitoramento approved é imutável — 409", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{
			ID: "mon-1", CreatedBy: "tech-1", Status: shared.StatusApproved,
		}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		notes := "x"
		_, err := svc.Update(techCtx("tech-1", "org-1"), "mon-1", monitoramento.UpdateRequest{Notes: &notes})
		assertStatus(t, err, 409)
	})

	t.Run("health_status inválido no update retorna 400", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{
			ID: "mon-1", CreatedBy: "tech-1", Status: shared.StatusDraft, HealthStatus: shared.HealthHealthy,
		}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		hs := "invalido"
		_, err := svc.Update(techCtx("tech-1", "org-1"), "mon-1", monitoramento.UpdateRequest{HealthStatus: &hs})
		assertStatus(t, err, 400)
	})
}

// --- SoftDelete ---

func TestSoftDelete(t *testing.T) {
	t.Run("TECH deleta próprio draft — ok", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{ID: "mon-1", CreatedBy: "tech-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		if err := svc.SoftDelete(techCtx("tech-1", "org-1"), "mon-1"); err != nil {
			t.Fatalf("erro: %v", err)
		}
		if repo.deleteCalls != 1 {
			t.Errorf("delete calls: got %d", repo.deleteCalls)
		}
	})

	t.Run("não pode deletar fora de draft — 422", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{ID: "mon-1", CreatedBy: "tech-1", Status: shared.StatusApproved}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		err := svc.SoftDelete(techCtx("tech-1", "org-1"), "mon-1")
		assertStatus(t, err, 422)
	})

	t.Run("TECH não pode deletar de outro — 403", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{ID: "mon-1", CreatedBy: "outro", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		err := svc.SoftDelete(techCtx("tech-1", "org-1"), "mon-1")
		assertStatus(t, err, 403)
	})
}

// --- Submit ---

func TestSubmit(t *testing.T) {
	t.Run("draft → pending", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{ID: "mon-1", CreatedBy: "tech-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		resp, err := svc.Submit(techCtx("tech-1", "org-1"), "mon-1")
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if resp.Status != shared.StatusPending {
			t.Errorf("status: got %q", resp.Status)
		}
	})

	t.Run("não-draft retorna 409", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{ID: "mon-1", CreatedBy: "tech-1", Status: shared.StatusApproved}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		_, err := svc.Submit(techCtx("tech-1", "org-1"), "mon-1")
		assertStatus(t, err, 409)
	})

	t.Run("TECH não pode submeter de outro — 403", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{ID: "mon-1", CreatedBy: "outro", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		_, err := svc.Submit(techCtx("tech-1", "org-1"), "mon-1")
		assertStatus(t, err, 403)
	})
}

// --- Approve ---

func TestApprove(t *testing.T) {
	t.Run("pending → approved preenche approved_by", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{ID: "mon-1", Status: shared.StatusPending}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		resp, err := svc.Approve(adminCtx("admin-1", "org-1"), "mon-1")
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
		existing := &monitoramento.Monitoramento{ID: "mon-1", Status: shared.StatusDraft}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		_, err := svc.Approve(adminCtx("admin-1", "org-1"), "mon-1")
		assertStatus(t, err, 409)
	})
}

// --- Reject ---

func TestReject(t *testing.T) {
	t.Run("pending → rejected com motivo", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{ID: "mon-1", Status: shared.StatusPending}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		resp, err := svc.Reject(adminCtx("admin-1", "org-1"), "mon-1", monitoramento.RejectRequest{Reason: "dados incompletos"})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if resp.Status != shared.StatusRejected {
			t.Errorf("status: got %q", resp.Status)
		}
		if resp.RejectionReason != "dados incompletos" {
			t.Errorf("reason: got %q", resp.RejectionReason)
		}
	})

	t.Run("não-pending retorna 409", func(t *testing.T) {
		existing := &monitoramento.Monitoramento{ID: "mon-1", Status: shared.StatusApproved}
		repo := &mockRepo{stored: existing}
		svc := newSvc(repo)

		_, err := svc.Reject(adminCtx("admin-1", "org-1"), "mon-1", monitoramento.RejectRequest{Reason: "x"})
		assertStatus(t, err, 409)
	})
}

// --- List ---

func TestList(t *testing.T) {
	t.Run("retorna resultados paginados", func(t *testing.T) {
		repo := &mockRepo{listResult: []*monitoramento.Monitoramento{
			{ID: "mon-1", Status: shared.StatusDraft, CreatedBy: "u-1", AssetID: "a-1"},
			{ID: "mon-2", Status: shared.StatusApproved, CreatedBy: "u-1", AssetID: "a-1"},
		}}
		svc := newSvc(repo)

		result, err := svc.List(adminCtx("admin-1", "org-1"), monitoramento.ListFilters{AssetID: "a-1", Limit: 20})
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if len(result.Data) != 2 {
			t.Errorf("len: got %d", len(result.Data))
		}
	})
}

// --- GetByID ---

func TestGetByID(t *testing.T) {
	t.Run("viewer não vê não-approved — 404", func(t *testing.T) {
		repo := &mockRepo{stored: &monitoramento.Monitoramento{ID: "mon-1", Status: shared.StatusPending}}
		svc := newSvc(repo)

		_, err := svc.GetByID(viewerCtx("org-1"), "mon-1")
		assertStatus(t, err, 404)
	})

	t.Run("viewer vê approved", func(t *testing.T) {
		repo := &mockRepo{stored: &monitoramento.Monitoramento{ID: "mon-1", Status: shared.StatusApproved}}
		svc := newSvc(repo)

		resp, err := svc.GetByID(viewerCtx("org-1"), "mon-1")
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if resp.ID != "mon-1" {
			t.Errorf("id: %q", resp.ID)
		}
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

package sync_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	syncsvc "github.com/allan/ecoinventario/internal/sync"
	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
)

// --- mocks ---

type mockIdempotencyRepo struct {
	stored   map[string]*syncsvc.IdempotencyRecord
	storeErr error
}

func (m *mockIdempotencyRepo) Find(_ context.Context, key string) (*syncsvc.IdempotencyRecord, error) {
	if m.stored == nil {
		return nil, nil
	}
	rec, ok := m.stored[key]
	if !ok {
		return nil, nil
	}
	return rec, nil
}

func (m *mockIdempotencyRepo) Store(_ context.Context, rec *syncsvc.IdempotencyRecord) error {
	if m.storeErr != nil {
		return m.storeErr
	}
	if m.stored == nil {
		m.stored = make(map[string]*syncsvc.IdempotencyRecord)
	}
	m.stored[rec.IdempotencyKey] = rec
	return nil
}

func (m *mockIdempotencyRepo) Cleanup(_ context.Context, _ time.Time) (int64, error) {
	return 0, nil
}

type mockDispatcher struct {
	createID        string
	createUpdatedAt time.Time
	createResult    json.RawMessage
	createErr       error

	updateUpdatedAt time.Time
	updateResult    json.RawMessage
	updateErr       error

	currentUpdatedAt *time.Time
	currentData      json.RawMessage
	currentErr       error

	deleteErr error
}

func (m *mockDispatcher) Create(_ context.Context, _ string, _ json.RawMessage) (string, time.Time, json.RawMessage, error) {
	return m.createID, m.createUpdatedAt, m.createResult, m.createErr
}

func (m *mockDispatcher) Update(_ context.Context, _, _ string, _ json.RawMessage) (time.Time, json.RawMessage, error) {
	return m.updateUpdatedAt, m.updateResult, m.updateErr
}

func (m *mockDispatcher) GetCurrentState(_ context.Context, _, _ string) (*time.Time, json.RawMessage, error) {
	return m.currentUpdatedAt, m.currentData, m.currentErr
}

func (m *mockDispatcher) Delete(_ context.Context, _, _ string) error {
	return m.deleteErr
}

type mockSyncRepo struct {
	changes []syncsvc.Change
}

func (m *mockSyncRepo) PullChanges(_ context.Context, _ syncsvc.PullParams) ([]syncsvc.Change, error) {
	return m.changes, nil
}

type noopAuditRepo struct{}

func (n *noopAuditRepo) Insert(_ context.Context, _ *audit.LogEntry) error { return nil }

func newSvc(idem syncsvc.IdempotencyRepository, disp syncsvc.EntityDispatcher, repo syncsvc.SyncRepository) *syncsvc.Service {
	return syncsvc.NewService(idem, disp, repo)
}

func authCtx(orgID, userID string) context.Context {
	ctx := shared.WithOrgID(context.Background(), orgID)
	ctx = shared.WithUserID(ctx, userID)
	return shared.WithRole(ctx, shared.RoleTech)
}

// --- helpers ---

func makeOp(action, entityType, entityID, idemKey string) syncsvc.Operation {
	return syncsvc.Operation{
		IdempotencyKey: idemKey,
		Action:         action,
		EntityType:     entityType,
		EntityID:       entityID,
		Payload:        json.RawMessage(`{}`),
	}
}

func makeOpWithTime(action, entityType, entityID, idemKey string, clientAt time.Time) syncsvc.Operation {
	op := makeOp(action, entityType, entityID, idemKey)
	op.ClientUpdatedAt = &clientAt
	return op
}

// --- ProcessPush tests ---

func TestProcessPush_TooManyOperations(t *testing.T) {
	svc := newSvc(&mockIdempotencyRepo{}, &mockDispatcher{}, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	ops := make([]syncsvc.Operation, 51)
	for i := range ops {
		ops[i] = makeOp(syncsvc.ActionCreate, "asset", "id-1", "key-"+string(rune('a'+i)))
	}

	_, err := svc.ProcessPush(ctx, syncsvc.PushRequest{Operations: ops})
	if err == nil {
		t.Fatal("esperava erro para batch > 50")
	}
}

func TestProcessPush_Duplicate(t *testing.T) {
	t0 := time.Date(2025, 1, 1, 10, 0, 0, 0, time.UTC)
	prevResult, _ := json.Marshal(syncsvc.OperationResult{
		IdempotencyKey:  "key-1",
		Status:          syncsvc.StatusOk,
		EntityID:        "entity-1",
		ServerUpdatedAt: &t0,
	})

	idem := &mockIdempotencyRepo{
		stored: map[string]*syncsvc.IdempotencyRecord{
			"key-1": {
				IdempotencyKey: "key-1",
				EntityType:     "asset",
				EntityID:       "entity-1",
				Result:         prevResult,
			},
		},
	}

	svc := newSvc(idem, &mockDispatcher{}, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	resp, err := svc.ProcessPush(ctx, syncsvc.PushRequest{
		Operations: []syncsvc.Operation{makeOp(syncsvc.ActionCreate, "asset", "entity-1", "key-1")},
	})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(resp.Results) != 1 {
		t.Fatalf("esperava 1 resultado, got %d", len(resp.Results))
	}
	if resp.Results[0].Status != syncsvc.StatusDuplicate {
		t.Errorf("status: got %q, want %q", resp.Results[0].Status, syncsvc.StatusDuplicate)
	}
	if resp.Results[0].EntityID != "entity-1" {
		t.Errorf("entity_id: got %q", resp.Results[0].EntityID)
	}
}

func TestProcessPush_CreateOK(t *testing.T) {
	t0 := time.Date(2025, 6, 1, 10, 0, 0, 0, time.UTC)
	disp := &mockDispatcher{
		createID:        "new-entity-1",
		createUpdatedAt: t0,
		createResult:    json.RawMessage(`{"id":"new-entity-1"}`),
	}
	idem := &mockIdempotencyRepo{}
	svc := newSvc(idem, disp, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	resp, err := svc.ProcessPush(ctx, syncsvc.PushRequest{
		Operations: []syncsvc.Operation{makeOp(syncsvc.ActionCreate, "asset", "", "key-create-1")},
	})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	r := resp.Results[0]
	if r.Status != syncsvc.StatusOk {
		t.Errorf("status: got %q, want ok", r.Status)
	}
	if r.EntityID != "new-entity-1" {
		t.Errorf("entity_id: got %q", r.EntityID)
	}
	if r.ServerUpdatedAt == nil || !r.ServerUpdatedAt.Equal(t0) {
		t.Errorf("server_updated_at: got %v", r.ServerUpdatedAt)
	}
	// Verifica que idempotency foi armazenado
	if _, ok := idem.stored["key-create-1"]; !ok {
		t.Error("esperava idempotency key armazenada")
	}
}

func TestProcessPush_UpdateNoConflict(t *testing.T) {
	t0 := time.Date(2025, 6, 1, 9, 0, 0, 0, time.UTC)
	t1 := time.Date(2025, 6, 1, 10, 0, 0, 0, time.UTC)
	disp := &mockDispatcher{
		currentUpdatedAt: &t0, // server_updated_at = t0
		currentData:      json.RawMessage(`{"status":"draft"}`),
		updateUpdatedAt:  t1,
		updateResult:     json.RawMessage(`{"id":"e-1"}`),
	}
	svc := newSvc(&mockIdempotencyRepo{}, disp, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	// client_updated_at igual ao server → sem conflito
	op := makeOpWithTime(syncsvc.ActionUpdate, "asset", "e-1", "key-upd-1", t0)
	resp, err := svc.ProcessPush(ctx, syncsvc.PushRequest{Operations: []syncsvc.Operation{op}})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	r := resp.Results[0]
	if r.Status != syncsvc.StatusOk {
		t.Errorf("status: got %q, want ok", r.Status)
	}
}

func TestProcessPush_UpdateConflict(t *testing.T) {
	serverAt := time.Date(2025, 6, 1, 11, 0, 0, 0, time.UTC) // server mais novo
	clientAt := time.Date(2025, 6, 1, 9, 0, 0, 0, time.UTC)  // cliente mais antigo

	disp := &mockDispatcher{
		currentUpdatedAt: &serverAt,
		currentData:      json.RawMessage(`{"notes":"editado pelo admin"}`),
	}
	svc := newSvc(&mockIdempotencyRepo{}, disp, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	op := makeOpWithTime(syncsvc.ActionUpdate, "asset", "e-2", "key-conflict-1", clientAt)
	resp, err := svc.ProcessPush(ctx, syncsvc.PushRequest{Operations: []syncsvc.Operation{op}})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	r := resp.Results[0]
	if r.Status != syncsvc.StatusConflict {
		t.Errorf("status: got %q, want conflict", r.Status)
	}
	if r.ServerVersion == nil {
		t.Fatal("esperava server_version")
	}
	if !r.ServerVersion.UpdatedAt.Equal(serverAt) {
		t.Errorf("server_version.updated_at: got %v", r.ServerVersion.UpdatedAt)
	}
	if r.ClientVersion == nil {
		t.Fatal("esperava client_version")
	}
	if !r.ClientVersion.UpdatedAt.Equal(clientAt) {
		t.Errorf("client_version.updated_at: got %v", r.ClientVersion.UpdatedAt)
	}
}

func TestProcessPush_UpdateMissingClientUpdatedAt(t *testing.T) {
	serverAt := time.Date(2025, 6, 1, 10, 0, 0, 0, time.UTC)
	disp := &mockDispatcher{
		currentUpdatedAt: &serverAt,
	}
	svc := newSvc(&mockIdempotencyRepo{}, disp, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	// UPDATE sem client_updated_at → erro na operação
	op := makeOp(syncsvc.ActionUpdate, "asset", "e-3", "key-upd-nots")
	resp, err := svc.ProcessPush(ctx, syncsvc.PushRequest{Operations: []syncsvc.Operation{op}})
	if err != nil {
		t.Fatalf("erro inesperado no batch: %v", err)
	}
	if resp.Results[0].Status != syncsvc.StatusError {
		t.Errorf("status: got %q, want error", resp.Results[0].Status)
	}
}

func TestProcessPush_DeleteOK(t *testing.T) {
	disp := &mockDispatcher{deleteErr: nil}
	idem := &mockIdempotencyRepo{}
	svc := newSvc(idem, disp, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	op := makeOp(syncsvc.ActionDelete, "manejo", "m-1", "key-del-1")
	resp, err := svc.ProcessPush(ctx, syncsvc.PushRequest{Operations: []syncsvc.Operation{op}})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	r := resp.Results[0]
	if r.Status != syncsvc.StatusOk {
		t.Errorf("status: got %q, want ok", r.Status)
	}
}

func TestProcessPush_BatchMixedOperations(t *testing.T) {
	t0 := time.Date(2025, 6, 1, 10, 0, 0, 0, time.UTC)
	disp := &mockDispatcher{
		createID:        "new-1",
		createUpdatedAt: t0,
		deleteErr:       nil,
	}
	idem := &mockIdempotencyRepo{}
	svc := newSvc(idem, disp, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	resp, err := svc.ProcessPush(ctx, syncsvc.PushRequest{
		Operations: []syncsvc.Operation{
			makeOp(syncsvc.ActionCreate, "asset", "", "key-c"),
			makeOp(syncsvc.ActionDelete, "manejo", "m-1", "key-d"),
		},
	})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(resp.Results) != 2 {
		t.Fatalf("esperava 2 resultados, got %d", len(resp.Results))
	}
	if resp.Results[0].Status != syncsvc.StatusOk {
		t.Errorf("op[0] status: %q", resp.Results[0].Status)
	}
	if resp.Results[1].Status != syncsvc.StatusOk {
		t.Errorf("op[1] status: %q", resp.Results[1].Status)
	}
}

func TestProcessPush_ServerTime(t *testing.T) {
	before := time.Now().UTC()
	svc := newSvc(&mockIdempotencyRepo{}, &mockDispatcher{createID: "x", createUpdatedAt: time.Now()}, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	resp, err := svc.ProcessPush(ctx, syncsvc.PushRequest{
		Operations: []syncsvc.Operation{makeOp(syncsvc.ActionCreate, "asset", "", "key-t")},
	})
	if err != nil {
		t.Fatal(err)
	}
	after := time.Now().UTC()
	if resp.ServerTime.Before(before) || resp.ServerTime.After(after) {
		t.Errorf("server_time fora do range esperado: %v", resp.ServerTime)
	}
}

// --- ProcessPull tests ---

func TestProcessPull_RetornaAlteracoes(t *testing.T) {
	t0 := time.Date(2025, 6, 1, 10, 0, 0, 0, time.UTC)
	t1 := time.Date(2025, 6, 2, 10, 0, 0, 0, time.UTC)

	repo := &mockSyncRepo{
		changes: []syncsvc.Change{
			{EntityType: "asset", EntityID: "a-1", Action: "update", UpdatedAt: t0},
			{EntityType: "manejo", EntityID: "m-1", Action: "create", UpdatedAt: t1},
		},
	}
	svc := newSvc(&mockIdempotencyRepo{}, &mockDispatcher{}, repo)
	ctx := authCtx("org-1", "user-1")

	since := time.Date(2025, 5, 31, 0, 0, 0, 0, time.UTC)
	resp, err := svc.ProcessPull(ctx, syncsvc.PullParams{Since: since, Limit: 100})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(resp.Changes) != 2 {
		t.Errorf("len changes: got %d, want 2", len(resp.Changes))
	}
	if resp.Changes[0].EntityType != "asset" {
		t.Errorf("changes[0].entity_type: %q", resp.Changes[0].EntityType)
	}
}

func TestProcessPull_IncluiSoftDeleted(t *testing.T) {
	t0 := time.Date(2025, 6, 1, 10, 0, 0, 0, time.UTC)
	repo := &mockSyncRepo{
		changes: []syncsvc.Change{
			{EntityType: "asset", EntityID: "a-del", Action: syncsvc.ChangeDelete, UpdatedAt: t0},
		},
	}
	svc := newSvc(&mockIdempotencyRepo{}, &mockDispatcher{}, repo)
	ctx := authCtx("org-1", "user-1")

	resp, err := svc.ProcessPull(ctx, syncsvc.PullParams{Since: t0.Add(-time.Hour), Limit: 100})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(resp.Changes) != 1 {
		t.Fatalf("esperava 1 change, got %d", len(resp.Changes))
	}
	if resp.Changes[0].Action != syncsvc.ChangeDelete {
		t.Errorf("action: got %q, want delete", resp.Changes[0].Action)
	}
}

func TestProcessPull_HasMore(t *testing.T) {
	changes := make([]syncsvc.Change, 3)
	base := time.Date(2025, 6, 1, 10, 0, 0, 0, time.UTC)
	for i := range changes {
		changes[i] = syncsvc.Change{
			EntityType: "asset",
			EntityID:   "a-" + string(rune('1'+i)),
			Action:     "update",
			UpdatedAt:  base.Add(time.Duration(i) * time.Hour),
		}
	}

	repo := &mockSyncRepo{changes: changes}
	svc := newSvc(&mockIdempotencyRepo{}, &mockDispatcher{}, repo)
	ctx := authCtx("org-1", "user-1")

	// Limit=2, repo retorna 3 → has_more=true
	resp, err := svc.ProcessPull(ctx, syncsvc.PullParams{Since: base.Add(-time.Hour), Limit: 2})
	if err != nil {
		t.Fatalf("erro: %v", err)
	}
	if !resp.HasMore {
		t.Error("esperava has_more=true")
	}
	if len(resp.Changes) != 2 {
		t.Errorf("changes len: got %d, want 2", len(resp.Changes))
	}
	if resp.NextCursor == nil {
		t.Error("esperava next_cursor")
	}
}

func TestProcessPull_LimitDefault(t *testing.T) {
	svc := newSvc(&mockIdempotencyRepo{}, &mockDispatcher{}, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	// Limit=0 → usa default 100
	resp, err := svc.ProcessPull(ctx, syncsvc.PullParams{Since: time.Now().Add(-time.Hour), Limit: 0})
	if err != nil {
		t.Fatal(err)
	}
	if resp == nil {
		t.Fatal("esperava response")
	}
}

func TestProcessPull_ServerTime(t *testing.T) {
	before := time.Now().UTC()
	svc := newSvc(&mockIdempotencyRepo{}, &mockDispatcher{}, &mockSyncRepo{})
	ctx := authCtx("org-1", "user-1")

	resp, _ := svc.ProcessPull(ctx, syncsvc.PullParams{Since: time.Now().Add(-time.Hour), Limit: 10})
	after := time.Now().UTC()

	if resp.ServerTime.Before(before) || resp.ServerTime.After(after) {
		t.Errorf("server_time fora do range: %v", resp.ServerTime)
	}
}

package audit_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/shared"
)

type mockAuditRepo struct {
	inserted    *audit.LogEntry
	listOrg     string
	listFilters audit.ListFilters
	listItems   []*audit.LogEntry
}

func (m *mockAuditRepo) Insert(_ context.Context, entry *audit.LogEntry) error {
	m.inserted = entry
	return nil
}

func (m *mockAuditRepo) List(_ context.Context, orgID string, filters audit.ListFilters) ([]*audit.LogEntry, error) {
	m.listOrg = orgID
	m.listFilters = filters
	return m.listItems, nil
}

func TestAuditServiceLog(t *testing.T) {
	t.Run("Log insere entrada com campos corretos", func(t *testing.T) {
		repo := &mockAuditRepo{}
		svc := audit.NewService(repo)

		changes, _ := json.Marshal(map[string]any{"status": map[string]string{"old": "draft", "new": "pending"}})
		meta, _ := json.Marshal(map[string]string{"ip": "127.0.0.1"})

		svc.Log(context.Background(), audit.Entry{
			OrganizationID: "org-1",
			EntityType:     "asset",
			EntityID:       "asset-1",
			Action:         "submit",
			PerformedBy:    "user-1",
			Changes:        changes,
			Metadata:       meta,
		})

		if repo.inserted == nil {
			t.Fatal("nenhuma entrada inserida")
		}
		if repo.inserted.EntityType != "asset" {
			t.Errorf("EntityType: got %q, want %q", repo.inserted.EntityType, "asset")
		}
		if repo.inserted.Action != "submit" {
			t.Errorf("Action: got %q, want %q", repo.inserted.Action, "submit")
		}
	})

	t.Run("Log não bloqueia nem propaga erro do repo", func(t *testing.T) {
		// mesmo que o repo falhe, não deve propagar
		svc := audit.NewService(&failingRepo{})

		// não deve entrar em pânico nem retornar erro
		svc.Log(context.Background(), audit.Entry{
			OrganizationID: "org-1",
			EntityType:     "asset",
			EntityID:       "asset-1",
			Action:         "create",
			PerformedBy:    "user-1",
		})
	})
}

func TestAuditServiceList(t *testing.T) {
	t.Run("exige admin", func(t *testing.T) {
		svc := audit.NewService(&mockAuditRepo{})
		ctx := shared.WithRole(shared.WithOrgID(context.Background(), "org-1"), shared.RoleTech)

		_, err := svc.List(ctx, audit.ListFilters{})
		if err == nil {
			t.Fatal("esperava erro para role nao-admin")
		}
	})

	t.Run("usa org do contexto e retorna performer", func(t *testing.T) {
		createdAt := time.Date(2026, 5, 3, 10, 0, 0, 0, time.UTC)
		repo := &mockAuditRepo{listItems: []*audit.LogEntry{{
			ID:              "log-1",
			EntityType:      "asset",
			EntityID:        "asset-1",
			Action:          "approve",
			PerformedBy:     "user-1",
			PerformedByName: "Admin",
			CreatedAt:       createdAt,
		}}}
		svc := audit.NewService(repo)
		ctx := shared.WithRole(shared.WithOrgID(context.Background(), "org-1"), shared.RoleAdmin)

		result, err := svc.List(ctx, audit.ListFilters{EntityType: "asset", Limit: 20})
		if err != nil {
			t.Fatalf("List retornou erro: %v", err)
		}

		if repo.listOrg != "org-1" {
			t.Fatalf("org: got %q, want org-1", repo.listOrg)
		}
		if repo.listFilters.EntityType != "asset" {
			t.Fatalf("entity_type: got %q, want asset", repo.listFilters.EntityType)
		}
		if len(result.Data) != 1 || result.Data[0].PerformedBy.Name != "Admin" {
			t.Fatalf("result inesperado: %+v", result.Data)
		}
	})
}

type failingRepo struct{}

func (f *failingRepo) Insert(_ context.Context, _ *audit.LogEntry) error {
	return &mockError{"falha simulada"}
}

func (f *failingRepo) List(_ context.Context, _ string, _ audit.ListFilters) ([]*audit.LogEntry, error) {
	return nil, &mockError{"falha simulada"}
}

type mockError struct{ msg string }

func (e *mockError) Error() string { return e.msg }

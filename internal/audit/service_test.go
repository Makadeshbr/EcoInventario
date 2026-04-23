package audit_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/allan/ecoinventario/internal/audit"
)

type mockAuditRepo struct {
	inserted *audit.LogEntry
}

func (m *mockAuditRepo) Insert(_ context.Context, entry *audit.LogEntry) error {
	m.inserted = entry
	return nil
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

type failingRepo struct{}

func (f *failingRepo) Insert(_ context.Context, _ *audit.LogEntry) error {
	return &mockError{"falha simulada"}
}

type mockError struct{ msg string }

func (e *mockError) Error() string { return e.msg }

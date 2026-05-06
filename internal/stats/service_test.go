package stats

import (
	"context"
	"testing"

	"github.com/allan/ecoinventario/internal/shared"
)

type fakeRepository struct {
	query Query
	resp  *DashboardStats
	err   error
}

func (f *fakeRepository) Dashboard(ctx context.Context, q Query) (*DashboardStats, error) {
	f.query = q
	return f.resp, f.err
}

func TestServiceDashboardUsaOrganizacaoDoContexto(t *testing.T) {
	repo := &fakeRepository{resp: &DashboardStats{}}
	svc := NewService(repo)
	ctx := shared.WithRole(shared.WithOrgID(context.Background(), "org-1"), shared.RoleAdmin)

	_, err := svc.Dashboard(ctx)
	if err != nil {
		t.Fatalf("Dashboard retornou erro: %v", err)
	}

	if repo.query.OrgID != "org-1" {
		t.Fatalf("OrgID: got %q, want %q", repo.query.OrgID, "org-1")
	}
	if repo.query.OnlyApproved {
		t.Fatal("admin nao deve restringir agregados a approved")
	}
}

func TestServiceDashboardViewerVeApenasApproved(t *testing.T) {
	repo := &fakeRepository{resp: &DashboardStats{}}
	svc := NewService(repo)
	ctx := shared.WithRole(shared.WithOrgID(context.Background(), "org-1"), shared.RoleViewer)

	_, err := svc.Dashboard(ctx)
	if err != nil {
		t.Fatalf("Dashboard retornou erro: %v", err)
	}

	if !repo.query.OnlyApproved {
		t.Fatal("viewer deve restringir agregados a approved")
	}
}

func TestServiceDashboardSemOrganizacaoRetornaForbidden(t *testing.T) {
	repo := &fakeRepository{resp: &DashboardStats{}}
	svc := NewService(repo)

	_, err := svc.Dashboard(context.Background())
	if err == nil {
		t.Fatal("esperava erro sem organization_id no contexto")
	}
}

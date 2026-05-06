package stats

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakeService struct {
	resp *DashboardStats
	err  error
}

func (f fakeService) Dashboard(ctx context.Context) (*DashboardStats, error) {
	return f.resp, f.err
}

func TestHandlerDashboardRetornaStats(t *testing.T) {
	handler := NewHandler(fakeService{resp: &DashboardStats{
		Summary: Summary{
			TotalAssets:     10,
			PendingApproval: 2,
			ApprovedAssets:  7,
			RejectedAssets:  1,
		},
	}})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats", nil)
	rr := httptest.NewRecorder()

	handler.HandleDashboard(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status: got %d, want %d", rr.Code, http.StatusOK)
	}

	var got DashboardStats
	if err := json.Unmarshal(rr.Body.Bytes(), &got); err != nil {
		t.Fatalf("json invalido: %v", err)
	}
	if got.Summary.PendingApproval != 2 {
		t.Fatalf("pending_approval: got %d, want 2", got.Summary.PendingApproval)
	}
}

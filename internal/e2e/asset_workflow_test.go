// Package e2e testa o fluxo completo entre services sem banco real.
// Cada test usa repositórios stateful in-memory para simular o ciclo
// TECH cria → TECH submete → ADMIN aprova → VIEWER enxerga no público.
package e2e_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/allan/ecoinventario/internal/asset"
	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/manejo"
	"github.com/allan/ecoinventario/internal/shared"
)

// ─── contextos de role ────────────────────────────────────────────────────

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

// ─── repositório stateful de asset ───────────────────────────────────────

type memAssetRepo struct {
	seq    int
	assets map[string]*asset.Asset
}

func newMemAssetRepo() *memAssetRepo {
	return &memAssetRepo{assets: make(map[string]*asset.Asset)}
}

func (r *memAssetRepo) Insert(_ context.Context, a *asset.Asset) error {
	r.seq++
	if a.ID == "" {
		a.ID = fmt.Sprintf("asset-%d", r.seq)
	}
	cp := *a
	r.assets[a.ID] = &cp
	return nil
}

func (r *memAssetRepo) FindByID(_ context.Context, id, _ string) (*asset.Asset, error) {
	a, ok := r.assets[id]
	if !ok {
		return nil, nil
	}
	cp := *a
	return &cp, nil
}

func (r *memAssetRepo) FindByQRCode(_ context.Context, qr string) (*asset.Asset, error) {
	for _, a := range r.assets {
		if a.QRCode == qr {
			cp := *a
			return &cp, nil
		}
	}
	return nil, nil
}

func (r *memAssetRepo) Update(_ context.Context, a *asset.Asset) error {
	if _, ok := r.assets[a.ID]; !ok {
		return fmt.Errorf("asset %s não encontrado", a.ID)
	}
	cp := *a
	r.assets[a.ID] = &cp
	return nil
}

func (r *memAssetRepo) UpdateStatus(_ context.Context, a *asset.Asset) error {
	existing, ok := r.assets[a.ID]
	if !ok {
		return fmt.Errorf("asset %s não encontrado", a.ID)
	}
	existing.Status = a.Status
	existing.ApprovedBy = a.ApprovedBy
	existing.RejectionReason = a.RejectionReason
	return nil
}

func (r *memAssetRepo) SoftDelete(_ context.Context, id, _ string) error {
	delete(r.assets, id)
	return nil
}

func (r *memAssetRepo) List(_ context.Context, f asset.ListFilters) ([]*asset.Asset, error) {
	var result []*asset.Asset
	for _, a := range r.assets {
		if f.OnlyApproved && a.Status != shared.StatusApproved {
			continue
		}
		cp := *a
		result = append(result, &cp)
	}
	return result, nil
}

func (r *memAssetRepo) Nearby(_ context.Context, _ asset.NearbyParams) ([]*asset.Asset, error) {
	return nil, nil
}

func (r *memAssetRepo) History(_ context.Context, id, _ string) ([]asset.HistoryEntry, error) {
	a, ok := r.assets[id]
	if !ok {
		return nil, nil
	}
	return []asset.HistoryEntry{{ID: a.ID, Version: a.Version, Status: a.Status}}, nil
}

// ─── repositório stateful de manejo ──────────────────────────────────────

type memManejoRepo struct {
	seq    int
	items  map[string]*manejo.Manejo
}

func newMemManejoRepo() *memManejoRepo {
	return &memManejoRepo{items: make(map[string]*manejo.Manejo)}
}

func (r *memManejoRepo) Insert(_ context.Context, m *manejo.Manejo) error {
	r.seq++
	m.ID = fmt.Sprintf("manejo-%d", r.seq)
	cp := *m
	r.items[m.ID] = &cp
	return nil
}

func (r *memManejoRepo) FindByID(_ context.Context, id, _ string) (*manejo.Manejo, error) {
	m, ok := r.items[id]
	if !ok {
		return nil, nil
	}
	cp := *m
	return &cp, nil
}

func (r *memManejoRepo) Update(_ context.Context, m *manejo.Manejo) error {
	if _, ok := r.items[m.ID]; !ok {
		return fmt.Errorf("manejo %s não encontrado", m.ID)
	}
	cp := *m
	r.items[m.ID] = &cp
	return nil
}

func (r *memManejoRepo) UpdateStatus(_ context.Context, m *manejo.Manejo) error {
	existing, ok := r.items[m.ID]
	if !ok {
		return fmt.Errorf("manejo %s não encontrado", m.ID)
	}
	existing.Status = m.Status
	existing.ApprovedBy = m.ApprovedBy
	existing.RejectionReason = m.RejectionReason
	return nil
}

func (r *memManejoRepo) SoftDelete(_ context.Context, id, _ string) error {
	delete(r.items, id)
	return nil
}

func (r *memManejoRepo) List(_ context.Context, f manejo.ListFilters) ([]*manejo.Manejo, error) {
	var result []*manejo.Manejo
	for _, m := range r.items {
		if f.OnlyApproved && m.Status != shared.StatusApproved {
			continue
		}
		cp := *m
		result = append(result, &cp)
	}
	return result, nil
}

// ─── helpers de stubs ────────────────────────────────────────────────────

type alwaysExistsChecker struct{}

func (alwaysExistsChecker) ExistsInOrg(_ context.Context, _, _ string) (bool, error) {
	return true, nil
}

type alwaysHasMedia struct{}

func (alwaysHasMedia) HasUploadedMedia(_ context.Context, _ string) (bool, error) {
	return true, nil
}

type alwaysBelongsMedia struct{}

func (alwaysBelongsMedia) BelongsToAsset(_ context.Context, _, _, _ string) (bool, error) {
	return true, nil
}

type noopAuditRepo struct{}

func (n *noopAuditRepo) Insert(_ context.Context, _ *audit.LogEntry) error { return nil }

func (n *noopAuditRepo) List(_ context.Context, _ string, _ audit.ListFilters) ([]*audit.LogEntry, error) {
	return nil, nil
}

// ─── E2E: asset approval workflow ────────────────────────────────────────

func TestAssetApprovalWorkflow(t *testing.T) {
	const (
		orgID   = "org-e2e"
		techID  = "tech-e2e"
		adminID = "admin-e2e"
	)

	repo := newMemAssetRepo()
	auditSvc := audit.NewService(&noopAuditRepo{})
	svc := asset.NewService(repo, alwaysExistsChecker{}, alwaysHasMedia{}, auditSvc)

	techCtxV := techCtx(techID, orgID)
	adminCtxV := adminCtx(adminID, orgID)
	viewerCtxV := viewerCtx(orgID)

	// 1. TECH cria asset em draft
	created, err := svc.Create(techCtxV, asset.CreateRequest{
		AssetTypeID: "type-123",
		Latitude:    -15.7801,
		Longitude:   -47.9292,
		QRCode:      "QR-E2E-001",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.Status != shared.StatusDraft {
		t.Fatalf("status após Create: got %q, want draft", created.Status)
	}
	assetID := created.ID

	// 2. VIEWER não enxerga asset em draft
	_, err = svc.GetByID(viewerCtxV, assetID)
	if err == nil {
		t.Fatal("viewer deveria receber 404 para asset em draft")
	}

	// 3. TECH submete o asset
	statusResp, err := svc.Submit(techCtxV, assetID)
	if err != nil {
		t.Fatalf("Submit: %v", err)
	}
	if statusResp.Status != shared.StatusPending {
		t.Fatalf("status após Submit: got %q, want pending", statusResp.Status)
	}

	// 4. VIEWER ainda não enxerga asset em pending
	_, err = svc.GetByID(viewerCtxV, assetID)
	if err == nil {
		t.Fatal("viewer deveria receber 404 para asset em pending")
	}

	// 5. ADMIN aprova o asset
	approvedResp, err := svc.Approve(adminCtxV, assetID)
	if err != nil {
		t.Fatalf("Approve: %v", err)
	}
	if approvedResp.Status != shared.StatusApproved {
		t.Fatalf("status após Approve: got %q, want approved", approvedResp.Status)
	}
	if approvedResp.ApprovedBy == nil || *approvedResp.ApprovedBy != adminID {
		t.Fatalf("approved_by: got %v, want %q", approvedResp.ApprovedBy, adminID)
	}

	// 6. VIEWER enxerga asset aprovado via GetByID
	visible, err := svc.GetByID(viewerCtxV, assetID)
	if err != nil {
		t.Fatalf("GetByID como viewer após aprovação: %v", err)
	}
	if visible.Status != shared.StatusApproved {
		t.Fatalf("status visível ao viewer: got %q, want approved", visible.Status)
	}

	// 7. VIEWER enxerga o asset na listagem
	page, err := svc.List(viewerCtxV, asset.ListFilters{Limit: 10})
	if err != nil {
		t.Fatalf("List como viewer: %v", err)
	}
	found := false
	for _, r := range page.Data {
		if r.ID == assetID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("asset aprovado não apareceu na listagem do viewer")
	}

	// 8. TECH não pode aprovar (deve ser bloqueado pela policy)
	_, err = svc.Approve(techCtxV, assetID)
	if err == nil {
		t.Fatal("TECH não deveria poder chamar Approve")
	}
}

// ─── E2E: rejeição e nova versão ─────────────────────────────────────────

func TestAssetRejectionAndNewVersion(t *testing.T) {
	const (
		orgID   = "org-e2e-v2"
		techID  = "tech-v2"
		adminID = "admin-v2"
	)

	repo := newMemAssetRepo()
	auditSvc := audit.NewService(&noopAuditRepo{})
	svc := asset.NewService(repo, alwaysExistsChecker{}, alwaysHasMedia{}, auditSvc)

	techCtxV := techCtx(techID, orgID)
	adminCtxV := adminCtx(adminID, orgID)

	// 1. Cria e submete
	created, _ := svc.Create(techCtxV, asset.CreateRequest{
		AssetTypeID: "type-abc",
		Latitude:    -23.5505,
		Longitude:   -46.6333,
		QRCode:      "QR-V2-001",
	})
	assetID := created.ID
	svc.Submit(techCtxV, assetID) //nolint:errcheck

	// 2. ADMIN rejeita com motivo
	rejected, err := svc.Reject(adminCtxV, assetID, asset.RejectRequest{Reason: "foto insuficiente"})
	if err != nil {
		t.Fatalf("Reject: %v", err)
	}
	if rejected.Status != shared.StatusRejected {
		t.Fatalf("status após Reject: got %q, want rejected", rejected.Status)
	}
	if rejected.RejectionReason != "foto insuficiente" {
		t.Fatalf("motivo: got %q, want %q", rejected.RejectionReason, "foto insuficiente")
	}

	// 3. TECH pode editar asset rejeitado (in-place)
	notes := "foto adicionada"
	updated, _, err := svc.Update(techCtxV, assetID, asset.UpdateRequest{Notes: &notes})
	if err != nil {
		t.Fatalf("Update após rejeição: %v", err)
	}
	if updated.Notes == nil || *updated.Notes != notes {
		t.Fatalf("notes após update: got %v", updated.Notes)
	}

	// 4. TECH submete novamente
	resubmit, err := svc.Submit(techCtxV, assetID)
	if err != nil {
		t.Fatalf("Submit após edição: %v", err)
	}
	if resubmit.Status != shared.StatusPending {
		t.Fatalf("status após resubmissão: got %q, want pending", resubmit.Status)
	}
}

// ─── E2E: manejo approval workflow ───────────────────────────────────────

func TestManejoApprovalWorkflow(t *testing.T) {
	const (
		orgID   = "org-manejo-e2e"
		techID  = "tech-manejo"
		adminID = "admin-manejo"
	)

	repo := newMemManejoRepo()
	auditSvc := audit.NewService(&noopAuditRepo{})
	svc := manejo.NewService(repo, alwaysExistsChecker{}, alwaysBelongsMedia{}, auditSvc)

	techCtxV := techCtx(techID, orgID)
	adminCtxV := adminCtx(adminID, orgID)
	viewerCtxV := viewerCtx(orgID)

	// 1. TECH cria manejo em draft
	created, err := svc.Create(techCtxV, manejo.CreateRequest{
		AssetID:     "asset-xyz",
		Description: "Poda de galhos secos",
	})
	if err != nil {
		t.Fatalf("Create manejo: %v", err)
	}
	if created.Status != shared.StatusDraft {
		t.Fatalf("status inicial: got %q, want draft", created.Status)
	}
	manejoID := created.ID

	// 2. VIEWER não enxerga manejo em draft
	_, err = svc.GetByID(viewerCtxV, manejoID)
	if err == nil {
		t.Fatal("viewer deveria receber 404 para manejo em draft")
	}

	// 3. TECH submete o manejo
	submitted, err := svc.Submit(techCtxV, manejoID)
	if err != nil {
		t.Fatalf("Submit manejo: %v", err)
	}
	if submitted.Status != shared.StatusPending {
		t.Fatalf("status após Submit: got %q, want pending", submitted.Status)
	}

	// 4. ADMIN aprova o manejo
	approved, err := svc.Approve(adminCtxV, manejoID)
	if err != nil {
		t.Fatalf("Approve manejo: %v", err)
	}
	if approved.Status != shared.StatusApproved {
		t.Fatalf("status após Approve: got %q, want approved", approved.Status)
	}
	if approved.ApprovedBy == nil || *approved.ApprovedBy != adminID {
		t.Fatalf("approved_by: got %v, want %q", approved.ApprovedBy, adminID)
	}

	// 5. VIEWER enxerga manejo aprovado
	visible, err := svc.GetByID(viewerCtxV, manejoID)
	if err != nil {
		t.Fatalf("GetByID como viewer: %v", err)
	}
	if visible.Status != shared.StatusApproved {
		t.Fatalf("status visível ao viewer: got %q, want approved", visible.Status)
	}

	// 6. VIEWER enxerga na listagem
	page, err := svc.List(viewerCtxV, manejo.ListFilters{Limit: 10})
	if err != nil {
		t.Fatalf("List como viewer: %v", err)
	}
	found := false
	for _, r := range page.Data {
		if r.ID == manejoID {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("manejo aprovado não apareceu na listagem do viewer")
	}
}

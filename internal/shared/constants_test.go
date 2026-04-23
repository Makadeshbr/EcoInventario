package shared

import (
	"testing"
)

func TestStatusConstants_ValoresCorretos(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"StatusDraft", StatusDraft, "draft"},
		{"StatusPending", StatusPending, "pending"},
		{"StatusApproved", StatusApproved, "approved"},
		{"StatusRejected", StatusRejected, "rejected"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("%s: esperado '%s', recebeu '%s'", tt.name, tt.expected, tt.got)
			}
		})
	}
}

func TestRoleConstants_ValoresCorretos(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"RoleTech", RoleTech, "tech"},
		{"RoleAdmin", RoleAdmin, "admin"},
		{"RoleViewer", RoleViewer, "viewer"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("%s: esperado '%s', recebeu '%s'", tt.name, tt.expected, tt.got)
			}
		})
	}
}

func TestHealthConstants_ValoresCorretos(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"HealthHealthy", HealthHealthy, "healthy"},
		{"HealthWarning", HealthWarning, "warning"},
		{"HealthCritical", HealthCritical, "critical"},
		{"HealthDead", HealthDead, "dead"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("%s: esperado '%s', recebeu '%s'", tt.name, tt.expected, tt.got)
			}
		})
	}
}

func TestAuditActionConstants_ValoresCorretos(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"AuditCreate", AuditCreate, "create"},
		{"AuditUpdate", AuditUpdate, "update"},
		{"AuditDelete", AuditDelete, "delete"},
		{"AuditApprove", AuditApprove, "approve"},
		{"AuditReject", AuditReject, "reject"},
		{"AuditSubmit", AuditSubmit, "submit"},
		{"AuditLogin", AuditLogin, "login"},
		{"AuditLogout", AuditLogout, "logout"},
		{"AuditUpload", AuditUpload, "upload"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("%s: esperado '%s', recebeu '%s'", tt.name, tt.expected, tt.got)
			}
		})
	}
}

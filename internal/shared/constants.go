package shared

// Status de entidades com workflow de aprovação.
const (
	StatusDraft    = "draft"
	StatusPending  = "pending"
	StatusApproved = "approved"
	StatusRejected = "rejected"
)

// Roles de usuário no sistema.
const (
	RoleTech   = "tech"
	RoleAdmin  = "admin"
	RoleViewer = "viewer"
)

// HealthStatus para monitoramentos de ativos.
const (
	HealthHealthy  = "healthy"
	HealthWarning  = "warning"
	HealthCritical = "critical"
	HealthDead     = "dead"
)

// AuditActions representam ações rastreáveis no audit_log.
const (
	AuditCreate  = "create"
	AuditUpdate  = "update"
	AuditDelete  = "delete"
	AuditApprove = "approve"
	AuditReject  = "reject"
	AuditSubmit  = "submit"
	AuditLogin   = "login"
	AuditLogout  = "logout"
	AuditUpload  = "upload"
)

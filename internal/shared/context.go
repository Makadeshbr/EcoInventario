package shared

import "context"

type contextKey string

const (
	ctxUserID contextKey = "user_id"
	ctxOrgID  contextKey = "org_id"
	ctxRole   contextKey = "role"
)

func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, ctxUserID, userID)
}

func WithOrgID(ctx context.Context, orgID string) context.Context {
	return context.WithValue(ctx, ctxOrgID, orgID)
}

func WithRole(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, ctxRole, role)
}

func GetUserID(ctx context.Context) string {
	if v, ok := ctx.Value(ctxUserID).(string); ok {
		return v
	}
	return ""
}

func GetOrgID(ctx context.Context) string {
	if v, ok := ctx.Value(ctxOrgID).(string); ok {
		return v
	}
	return ""
}

func GetRole(ctx context.Context) string {
	if v, ok := ctx.Value(ctxRole).(string); ok {
		return v
	}
	return ""
}

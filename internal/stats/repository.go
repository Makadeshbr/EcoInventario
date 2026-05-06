package stats

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Dashboard(ctx context.Context, q Query) (*DashboardStats, error) {
	where, args := statsWhere(q)

	summary, err := r.summary(ctx, where, args)
	if err != nil {
		return nil, err
	}
	byStatus, err := r.assetsByStatus(ctx, where, args)
	if err != nil {
		return nil, err
	}
	byType, err := r.assetsByType(ctx, where, args)
	if err != nil {
		return nil, err
	}
	monthly, err := r.monthlyActivity(ctx, where, args)
	if err != nil {
		return nil, err
	}

	return &DashboardStats{
		Summary:         summary,
		AssetsByStatus:  byStatus,
		AssetsByType:    byType,
		MonthlyActivity: monthly,
	}, nil
}

func statsWhere(q Query) (string, []any) {
	conditions := []string{"a.organization_id = $1", "a.deleted_at IS NULL"}
	if q.OnlyApproved {
		conditions = append(conditions, "a.status = 'approved'")
	}
	return strings.Join(conditions, " AND "), []any{q.OrgID}
}

func (r *repository) summary(ctx context.Context, where string, args []any) (Summary, error) {
	query := fmt.Sprintf(`
		SELECT
			COUNT(*)::int,
			COUNT(*) FILTER (WHERE a.status = 'pending')::int,
			COUNT(*) FILTER (WHERE a.status = 'approved')::int,
			COUNT(*) FILTER (WHERE a.status = 'rejected')::int
		FROM assets a
		WHERE %s
	`, where)

	var s Summary
	if err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&s.TotalAssets,
		&s.PendingApproval,
		&s.ApprovedAssets,
		&s.RejectedAssets,
	); err != nil {
		return Summary{}, fmt.Errorf("lendo resumo de stats: %w", err)
	}
	return s, nil
}

func (r *repository) assetsByStatus(ctx context.Context, where string, args []any) ([]StatusCount, error) {
	query := fmt.Sprintf(`
		SELECT a.status, COUNT(*)::int
		FROM assets a
		WHERE %s
		GROUP BY a.status
		ORDER BY CASE a.status
			WHEN 'draft' THEN 1
			WHEN 'pending' THEN 2
			WHEN 'approved' THEN 3
			WHEN 'rejected' THEN 4
			ELSE 5
		END
	`, where)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("lendo stats por status: %w", err)
	}
	defer rows.Close()

	var result []StatusCount
	for rows.Next() {
		var item StatusCount
		if err := rows.Scan(&item.Status, &item.Count); err != nil {
			return nil, fmt.Errorf("escaneando stats por status: %w", err)
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *repository) assetsByType(ctx context.Context, where string, args []any) ([]TypeCount, error) {
	query := fmt.Sprintf(`
		SELECT at.id, at.name, COUNT(*)::int
		FROM assets a
		JOIN asset_types at ON at.id = a.asset_type_id
		WHERE %s
		GROUP BY at.id, at.name
		ORDER BY COUNT(*) DESC, at.name ASC
	`, where)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("lendo stats por tipo: %w", err)
	}
	defer rows.Close()

	var result []TypeCount
	for rows.Next() {
		var item TypeCount
		if err := rows.Scan(&item.AssetTypeID, &item.Name, &item.Count); err != nil {
			return nil, fmt.Errorf("escaneando stats por tipo: %w", err)
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *repository) monthlyActivity(ctx context.Context, where string, args []any) ([]MonthlyActivity, error) {
	query := fmt.Sprintf(`
		SELECT
			to_char(date_trunc('month', a.created_at), 'YYYY-MM') AS month,
			COUNT(*)::int AS created_count,
			COUNT(*) FILTER (WHERE a.status = 'approved')::int AS approved_count
		FROM assets a
		WHERE %s
		  AND a.created_at >= date_trunc('month', now()) - interval '11 months'
		GROUP BY date_trunc('month', a.created_at)
		ORDER BY date_trunc('month', a.created_at) ASC
	`, where)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("lendo atividade mensal: %w", err)
	}
	defer rows.Close()

	var result []MonthlyActivity
	for rows.Next() {
		var item MonthlyActivity
		if err := rows.Scan(&item.Month, &item.CreatedCount, &item.ApprovedCount); err != nil {
			return nil, fmt.Errorf("escaneando atividade mensal: %w", err)
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

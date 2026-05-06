package stats

// Query concentra os filtros seguros calculados a partir do JWT.
type Query struct {
	OrgID        string
	OnlyApproved bool
}

type Summary struct {
	TotalAssets     int `json:"total_assets"`
	PendingApproval int `json:"pending_approval"`
	ApprovedAssets  int `json:"approved_assets"`
	RejectedAssets  int `json:"rejected_assets"`
}

type StatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type TypeCount struct {
	AssetTypeID string `json:"asset_type_id"`
	Name        string `json:"name"`
	Count       int    `json:"count"`
}

type MonthlyActivity struct {
	Month         string `json:"month"`
	CreatedCount  int    `json:"created_count"`
	ApprovedCount int    `json:"approved_count"`
}

type DashboardStats struct {
	Summary         Summary           `json:"summary"`
	AssetsByStatus  []StatusCount     `json:"assets_by_status"`
	AssetsByType    []TypeCount       `json:"assets_by_type"`
	MonthlyActivity []MonthlyActivity `json:"monthly_activity"`
}

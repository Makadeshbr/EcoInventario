package organization

import "time"

// Organization representa uma organização no sistema.
type Organization struct {
	ID        string
	Name      string
	Slug      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

package vo

import "github.com/allan/ecoinventario/internal/shared/apperror"

// Coordinates encapsula um par (latitude, longitude) com invariantes validadas.
// lat ∈ [-90, 90], lng ∈ [-180, 180].
type Coordinates struct {
	Lat float64
	Lng float64
}

func NewCoordinates(lat, lng float64) (Coordinates, error) {
	if lat < -90 || lat > 90 {
		return Coordinates{}, apperror.NewValidation("latitude deve estar entre -90 e 90")
	}
	if lng < -180 || lng > 180 {
		return Coordinates{}, apperror.NewValidation("longitude deve estar entre -180 e 180")
	}
	return Coordinates{Lat: lat, Lng: lng}, nil
}

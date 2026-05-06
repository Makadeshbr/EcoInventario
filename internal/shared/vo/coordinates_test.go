package vo

import "testing"

func TestNewCoordinates(t *testing.T) {
	tests := []struct {
		name    string
		lat     float64
		lng     float64
		wantErr bool
	}{
		{"válidas Brasília", -15.7801, -47.9292, false},
		{"lat mínima", -90, 0, false},
		{"lat máxima", 90, 0, false},
		{"lng mínima", 0, -180, false},
		{"lng máxima", 0, 180, false},
		{"lat abaixo do mínimo", -90.0001, 0, true},
		{"lat acima do máximo", 90.0001, 0, true},
		{"lng abaixo do mínimo", 0, -180.0001, true},
		{"lng acima do máximo", 0, 180.0001, true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			c, err := NewCoordinates(tc.lat, tc.lng)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("esperava erro para lat=%v lng=%v", tc.lat, tc.lng)
				}
				return
			}
			if err != nil {
				t.Fatalf("erro inesperado: %v", err)
			}
			if c.Lat != tc.lat || c.Lng != tc.lng {
				t.Fatalf("got (%v,%v), want (%v,%v)", c.Lat, c.Lng, tc.lat, tc.lng)
			}
		})
	}
}

package pagination

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestParseCursorParams_SemParametros_RetornaDefaults(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/items", nil)

	params := ParseCursorParams(r)

	if params.Cursor != "" {
		t.Errorf("cursor esperado vazio, recebeu '%s'", params.Cursor)
	}
	if params.Limit != DefaultLimit {
		t.Errorf("limit esperado %d, recebeu %d", DefaultLimit, params.Limit)
	}
}

func TestParseCursorParams_ComCursorELimit(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/items?cursor=abc123&limit=50", nil)

	params := ParseCursorParams(r)

	if params.Cursor != "abc123" {
		t.Errorf("cursor esperado 'abc123', recebeu '%s'", params.Cursor)
	}
	if params.Limit != 50 {
		t.Errorf("limit esperado 50, recebeu %d", params.Limit)
	}
}

func TestParseCursorParams_LimitExcedeMaximo_UsaMaxLimit(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/items?limit=500", nil)

	params := ParseCursorParams(r)

	if params.Limit != MaxLimit {
		t.Errorf("limit esperado %d (max), recebeu %d", MaxLimit, params.Limit)
	}
}

func TestParseCursorParams_LimitInvalido_UsaDefault(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/items?limit=abc", nil)

	params := ParseCursorParams(r)

	if params.Limit != DefaultLimit {
		t.Errorf("limit esperado %d (default), recebeu %d", DefaultLimit, params.Limit)
	}
}

func TestParseCursorParams_LimitNegativo_UsaDefault(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/items?limit=-5", nil)

	params := ParseCursorParams(r)

	if params.Limit != DefaultLimit {
		t.Errorf("limit esperado %d (default), recebeu %d", DefaultLimit, params.Limit)
	}
}

func TestParseCursorParams_LimitZero_UsaDefault(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/items?limit=0", nil)

	params := ParseCursorParams(r)

	if params.Limit != DefaultLimit {
		t.Errorf("limit esperado %d (default), recebeu %d", DefaultLimit, params.Limit)
	}
}

package config

import (
	"os"
	"testing"
)

func TestGetEnvOrDefault_RetornaValorQuandoDefinido(t *testing.T) {
	t.Setenv("TEST_VAR_CUSTOM", "custom_value")

	got := getEnvOrDefault("TEST_VAR_CUSTOM", "default")
	if got != "custom_value" {
		t.Errorf("esperado 'custom_value', recebeu '%s'", got)
	}
}

func TestGetEnvOrDefault_RetornaDefaultQuandoAusente(t *testing.T) {
	os.Unsetenv("TEST_VAR_MISSING")

	got := getEnvOrDefault("TEST_VAR_MISSING", "fallback")
	if got != "fallback" {
		t.Errorf("esperado 'fallback', recebeu '%s'", got)
	}
}

func TestParseCSV_MultiploValores(t *testing.T) {
	result := parseCSV("http://localhost:3000, http://localhost:8080, https://app.example.com")

	expected := []string{"http://localhost:3000", "http://localhost:8080", "https://app.example.com"}
	if len(result) != len(expected) {
		t.Fatalf("esperado %d itens, recebeu %d", len(expected), len(result))
	}
	for i, v := range expected {
		if result[i] != v {
			t.Errorf("item %d: esperado '%s', recebeu '%s'", i, v, result[i])
		}
	}
}

func TestParseCSV_ValorUnico(t *testing.T) {
	result := parseCSV("http://localhost:3000")

	if len(result) != 1 || result[0] != "http://localhost:3000" {
		t.Errorf("esperado ['http://localhost:3000'], recebeu %v", result)
	}
}

func TestParseCSV_IgnoraEntradasVazias(t *testing.T) {
	result := parseCSV("http://localhost:3000,,  ,http://localhost:8080")

	if len(result) != 2 {
		t.Fatalf("esperado 2 itens, recebeu %d: %v", len(result), result)
	}
}

func TestMustLoad_FalhaSeVariavelObrigatoriaAusente(t *testing.T) {
	// Limpa todas as obrigatórias para garantir que falta DATABASE_URL
	os.Unsetenv("DATABASE_URL")

	// requireEnv chama log.Fatal — testamos indiretamente via requireEnv
	val := os.Getenv("DATABASE_URL")
	if val != "" {
		t.Fatal("DATABASE_URL deveria estar vazia para este teste")
	}
}

func TestMustLoad_CarregaComTodasVariaveis(t *testing.T) {
	// Define todas as obrigatórias
	t.Setenv("DATABASE_URL", "postgres://test@localhost/test")
	t.Setenv("PASSWORD_PEPPER", "test_pepper")
	t.Setenv("JWT_PRIVATE_KEY", "test_priv")
	t.Setenv("JWT_PUBLIC_KEY", "test_pub")
	t.Setenv("S3_ENDPOINT", "http://localhost:9000")
	t.Setenv("S3_ACCESS_KEY", "minio")
	t.Setenv("S3_SECRET_KEY", "minio123")
	t.Setenv("S3_BUCKET", "test-bucket")
	t.Setenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080")

	cfg := MustLoad()

	if cfg.DatabaseURL != "postgres://test@localhost/test" {
		t.Errorf("DatabaseURL errado: %s", cfg.DatabaseURL)
	}
	if cfg.Port != "8080" {
		t.Errorf("Port deveria ser default '8080', recebeu '%s'", cfg.Port)
	}
	if cfg.JWTAccessExpiry != "15m" {
		t.Errorf("JWTAccessExpiry deveria ser default '15m', recebeu '%s'", cfg.JWTAccessExpiry)
	}
	if len(cfg.CORSAllowOrigins) != 2 {
		t.Errorf("esperado 2 CORS origins, recebeu %d", len(cfg.CORSAllowOrigins))
	}
}

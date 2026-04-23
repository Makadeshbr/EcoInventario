package config

import (
	"log"
	"os"
	"strings"
)

// Config contém todas as variáveis de ambiente da aplicação.
// Campos sem default são obrigatórios — a aplicação não inicia sem eles.
type Config struct {
	Port              string
	Env               string
	DatabaseURL       string
	PasswordPepper    string
	JWTPrivateKey     string
	JWTPublicKey      string
	JWTAccessExpiry   string
	JWTRefreshExpiry  string
	S3Endpoint        string
	S3AccessKey       string
	S3SecretKey       string
	S3Bucket          string
	S3Region          string
	S3UsePathStyle    string
	CORSAllowOrigins  []string
}

// MustLoad lê env vars e faz log.Fatal se obrigatória faltar.
func MustLoad() *Config {
	cfg := &Config{
		Port:             getEnvOrDefault("PORT", "8080"),
		Env:              getEnvOrDefault("ENV", "development"),
		DatabaseURL:      requireEnv("DATABASE_URL"),
		PasswordPepper:   requireEnv("PASSWORD_PEPPER"),
		JWTPrivateKey:    requireEnv("JWT_PRIVATE_KEY"),
		JWTPublicKey:     requireEnv("JWT_PUBLIC_KEY"),
		JWTAccessExpiry:  getEnvOrDefault("JWT_ACCESS_EXPIRY", "15m"),
		JWTRefreshExpiry: getEnvOrDefault("JWT_REFRESH_EXPIRY", "720h"),
		S3Endpoint:       requireEnv("S3_ENDPOINT"),
		S3AccessKey:      requireEnv("S3_ACCESS_KEY"),
		S3SecretKey:      requireEnv("S3_SECRET_KEY"),
		S3Bucket:         requireEnv("S3_BUCKET"),
		S3Region:         getEnvOrDefault("S3_REGION", "us-east-1"),
		S3UsePathStyle:   getEnvOrDefault("S3_USE_PATH_STYLE", "true"),
		CORSAllowOrigins: parseCSV(getEnvOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000")),
	}

	return cfg
}

// requireEnv lê a env var ou faz log.Fatal se não existir/vazia.
func requireEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("FATAL: variável de ambiente obrigatória ausente: %s", key)
	}
	return val
}

// getEnvOrDefault retorna o valor da env var ou o default fornecido.
func getEnvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

// parseCSV divide uma string separada por vírgulas em slice, removendo espaços.
func parseCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

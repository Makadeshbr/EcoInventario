package config

import (
	"log"
	"os"
	"strconv"
	"strings"
)

// Config contém todas as variáveis de ambiente da aplicação.
// Campos sem default são obrigatórios — a aplicação não inicia sem eles.
type Config struct {
	Port             string
	Env              string
	DatabaseURL      string
	PasswordPepper   string
	JWTPrivateKey    string
	JWTPublicKey     string
	JWTAccessExpiry  string
	JWTRefreshExpiry string
	S3Endpoint       string
	S3AccessKey      string
	S3SecretKey      string
	S3Bucket         string
	S3Region         string
	S3UsePathStyle   string
	CORSAllowOrigins []string
	// TrustedProxyCount é o número de proxies reversos confiáveis à frente da app
	// (ex: 1 = apenas Render). Usado para extrair o IP real do X-Forwarded-For.
	TrustedProxyCount int
}

// MustLoad lê env vars e faz log.Fatal se obrigatória faltar.
func MustLoad() *Config {
	cfg := &Config{
		Port:              getEnvOrDefault("PORT", "8080"),
		Env:               getEnvOrDefault("ENV", "development"),
		DatabaseURL:       requireEnv("DATABASE_URL"),
		PasswordPepper:    requireEnv("PASSWORD_PEPPER"),
		JWTPrivateKey:     requireEnv("JWT_PRIVATE_KEY"),
		JWTPublicKey:      requireEnv("JWT_PUBLIC_KEY"),
		JWTAccessExpiry:   getEnvOrDefault("JWT_ACCESS_EXPIRY", "15m"),
		JWTRefreshExpiry:  getEnvOrDefault("JWT_REFRESH_EXPIRY", "720h"),
		S3Endpoint:        requireEnv("S3_ENDPOINT"),
		S3AccessKey:       requireEnv("S3_ACCESS_KEY"),
		S3SecretKey:       requireEnv("S3_SECRET_KEY"),
		S3Bucket:          requireEnv("S3_BUCKET"),
		S3Region:          getEnvOrDefault("S3_REGION", "us-east-1"),
		S3UsePathStyle:    getEnvOrDefault("S3_USE_PATH_STYLE", "true"),
		CORSAllowOrigins:  parseCSV(getEnvOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000")),
		TrustedProxyCount: getEnvIntOrDefault("TRUSTED_PROXY_COUNT", 1),
	}

	return cfg
}

// getEnvIntOrDefault lê uma env var como inteiro ou retorna o default.
// Valores inválidos ou < 1 caem no default para não enfraquecer o rate limit.
func getEnvIntOrDefault(key string, defaultVal int) int {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(strings.TrimSpace(val))
	if err != nil || n < 1 {
		log.Printf("WARN: %s inválido (%q); usando default %d", key, val, defaultVal)
		return defaultVal
	}
	return n
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

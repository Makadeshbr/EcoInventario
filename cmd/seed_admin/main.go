// Comando seed_admin: cria um usuário admin inicial.
// A senha NUNCA é hardcoded — vem da env SEED_ADMIN_PASSWORD (obrigatória).
// Uso: SEED_ADMIN_PASSWORD=... go run ./cmd/seed_admin
package main

import (
	"context"
	"database/sql"
	"log"
	"os"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/config"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/user"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

const (
	defaultAdminName  = "Admin"
	defaultAdminEmail = "admin@ecoinventario.com"
	defaultOrgID      = "00000000-0000-0000-0000-000000000001"
	systemUserID      = "00000000-0000-0000-0000-000000000000"
)

func main() {
	_ = godotenv.Load(".env")

	password := os.Getenv("SEED_ADMIN_PASSWORD")
	if password == "" {
		log.Fatal("FATAL: SEED_ADMIN_PASSWORD é obrigatória — defina uma senha forte via env")
	}

	name := getEnvOrDefault("SEED_ADMIN_NAME", defaultAdminName)
	email := getEnvOrDefault("SEED_ADMIN_EMAIL", defaultAdminEmail)

	cfg := config.MustLoad()
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Erro ao abrir conexão com o banco:", err)
	}
	defer db.Close()

	repo := user.NewRepository(db)
	auditSvc := audit.NewService(audit.NewRepository(db))
	svc := user.NewService(repo, auditSvc, cfg.PasswordPepper)

	ctx := shared.WithOrgID(context.Background(), defaultOrgID)
	ctx = shared.WithUserID(ctx, systemUserID)

	if _, err := svc.Create(ctx, user.CreateRequest{
		Name:     name,
		Email:    email,
		Password: password,
		Role:     shared.RoleAdmin,
	}); err != nil {
		log.Fatal("Erro ao criar admin:", err)
	}

	log.Printf("Admin '%s' (%s) criado com sucesso!", name, email)
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

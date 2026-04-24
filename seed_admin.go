package main

import (
	"context"
	"database/sql"
	"log"

	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/config"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/user"
	"github.com/joho/godotenv"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	_ = godotenv.Load(".env")
	cfg := config.MustLoad()
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}

	repo := user.NewRepository(db)
	auditSvc := audit.NewService(audit.NewRepository(db))
	svc := user.NewService(repo, auditSvc, cfg.PasswordPepper)

	// Contexto da org_id padrao
	ctx := shared.WithOrgID(context.Background(), "00000000-0000-0000-0000-000000000001")
	// Fake user id for audit
	ctx = shared.WithUserID(ctx, "00000000-0000-0000-0000-000000000000")

	_, err = svc.Create(ctx, user.CreateRequest{
		Name:     "Admin E2E",
		Email:    "admin@ecoinventario.com",
		Password: "SenhaForte123",
		Role:     shared.RoleAdmin,
	})

	if err != nil {
		log.Fatal("Erro ao criar admin:", err)
	}
	log.Println("Admin criado com sucesso!")
}

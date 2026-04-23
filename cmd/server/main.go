package main

import (
	"database/sql"
	"log"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/allan/ecoinventario/internal/assettype"
	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/auth"
	"github.com/allan/ecoinventario/internal/config"
	"github.com/allan/ecoinventario/internal/middleware"
	"github.com/allan/ecoinventario/internal/organization"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/user"
	"github.com/go-chi/chi/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	cfg := config.MustLoad()

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("falha ao conectar ao banco:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("falha ao verificar conexão com banco:", err)
	}

	// Repos
	auditRepo := audit.NewRepository(db)
	authRepo := auth.NewRepository(db)
	orgRepo := organization.NewRepository(db)
	userRepo := user.NewRepository(db)
	assetTypeRepo := assettype.NewRepository(db)

	// Services
	auditSvc := audit.NewService(auditRepo)
	orgSvc := organization.NewService(orgRepo)
	_ = orgSvc // usado indiretamente; disponível para handlers futuros

	accessExpiry, err := time.ParseDuration(cfg.JWTAccessExpiry)
	if err != nil {
		log.Fatal("JWT_ACCESS_EXPIRY inválido:", err)
	}
	refreshExpiry, err := time.ParseDuration(cfg.JWTRefreshExpiry)
	if err != nil {
		log.Fatal("JWT_REFRESH_EXPIRY inválido:", err)
	}

	authSvc, err := auth.NewService(authRepo, auditSvc, cfg.PasswordPepper, cfg.JWTPrivateKey, cfg.JWTPublicKey, accessExpiry, refreshExpiry)
	if err != nil {
		log.Fatal("falha ao inicializar auth service:", err)
	}

	jwtSvc, err := auth.NewJWTService(cfg.JWTPrivateKey, cfg.JWTPublicKey, accessExpiry)
	if err != nil {
		log.Fatal("falha ao inicializar jwt service:", err)
	}

	userSvc := user.NewService(userRepo, auditSvc, cfg.PasswordPepper)
	assetTypeSvc := assettype.NewService(assetTypeRepo, auditSvc)

	// Handlers
	authHandler := auth.NewHandler(authSvc)
	userHandler := user.NewHandler(userSvc)
	assetTypeHandler := assettype.NewHandler(assetTypeSvc)

	// Router
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.Logging)
	r.Use(middleware.Recover)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.CORS(cfg.CORSAllowOrigins))

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":{"code":"NOT_FOUND","message":"Rota não encontrada"}}`))
	})

	r.Route("/api/v1", func(r chi.Router) {
		// Rotas públicas de auth
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", authHandler.HandleLogin)
			r.Post("/refresh", authHandler.HandleRefresh)
			r.With(middleware.Auth(jwtSvc)).Post("/logout", authHandler.HandleLogout)
		})

		// Rotas autenticadas
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtSvc))

			// Users — ADMIN only
			r.Route("/users", func(r chi.Router) {
				r.Use(middleware.RequireRole(shared.RoleAdmin))
				r.Get("/", userHandler.HandleList)
				r.Post("/", userHandler.HandleCreate)
				r.Get("/{id}", userHandler.HandleGet)
				r.Patch("/{id}", userHandler.HandleUpdate)
				r.Delete("/{id}", userHandler.HandleDelete)
			})

			// Asset Types — leitura para todos, escrita para ADMIN
			r.Route("/asset-types", func(r chi.Router) {
				r.Get("/", assetTypeHandler.HandleList)
				r.With(middleware.RequireRole(shared.RoleAdmin)).Post("/", assetTypeHandler.HandleCreate)
				r.With(middleware.RequireRole(shared.RoleAdmin)).Patch("/{id}", assetTypeHandler.HandleUpdate)
			})
		})
	})

	// TODO: registrar rotas de assets, manejos, monitoramentos, etc. nas próximas tasks

	slog.Info("servidor iniciando", "port", cfg.Port, "env", cfg.Env)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal("falha ao iniciar servidor:", err)
	}
}

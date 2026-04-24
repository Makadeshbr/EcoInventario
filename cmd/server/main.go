package main

import (
	"context"
	"database/sql"
	"log"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/allan/ecoinventario/internal/asset"
	"github.com/allan/ecoinventario/internal/assettype"
	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/auth"
	"github.com/allan/ecoinventario/internal/config"
	"github.com/allan/ecoinventario/internal/media"
	"github.com/allan/ecoinventario/internal/middleware"
	"github.com/allan/ecoinventario/internal/organization"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/user"
	"github.com/go-chi/chi/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// assetTypeAdapter adapta assettype.Repository à interface estreita exigida
// pelo service de asset (asset.AssetTypeChecker) — evita import cíclico.
type assetTypeAdapter struct {
	repo assettype.Repository
}

func (a *assetTypeAdapter) ExistsInOrg(ctx context.Context, id, orgID string) (bool, error) {
	at, err := a.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return false, err
	}
	return at != nil, nil
}

// assetExistsAdapter adapta asset.Repository à interface estreita exigida
// pelo service de media (media.AssetChecker) — evita import cíclico.
type assetExistsAdapter struct {
	repo asset.Repository
}

func (a *assetExistsAdapter) ExistsInOrg(ctx context.Context, id, orgID string) (bool, error) {
	item, err := a.repo.FindByID(ctx, id, orgID)
	if err != nil {
		return false, err
	}
	return item != nil, nil
}

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
	assetRepo := asset.NewRepository(db)
	mediaRepo := media.NewRepository(db)

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

	// S3 client — useSSL=false para MinIO local; em produção AWS use true.
	useSSL := !strings.EqualFold(cfg.S3UsePathStyle, "true")
	s3Client, err := media.NewS3Client(cfg.S3Endpoint, cfg.S3AccessKey, cfg.S3SecretKey, useSSL)
	if err != nil {
		log.Fatal("falha ao inicializar cliente S3:", err)
	}

	mediaSvc := media.NewService(mediaRepo, s3Client, &assetExistsAdapter{repo: assetRepo}, auditSvc, cfg.S3Bucket)

	assetSvc := asset.NewService(
		assetRepo,
		&assetTypeAdapter{repo: assetTypeRepo},
		mediaSvc, // satisfaz asset.MediaChecker via HasUploadedMedia
		auditSvc,
	)

	// Handlers
	authHandler := auth.NewHandler(authSvc)
	userHandler := user.NewHandler(userSvc)
	assetTypeHandler := assettype.NewHandler(assetTypeSvc)
	assetHandler := asset.NewHandler(assetSvc)
	mediaHandler := media.NewHandler(mediaSvc)

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

			// Assets — leitura para todos (viewer filtra approved no service).
			// Escrita: tech ou admin. Aprovação/rejeição: apenas admin.
			r.Route("/assets", func(r chi.Router) {
				r.Get("/", assetHandler.HandleList)
				r.Get("/nearby", assetHandler.HandleNearby)
				r.Get("/{id}", assetHandler.HandleGet)
				r.Get("/{id}/history", assetHandler.HandleHistory)

				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(shared.RoleAdmin, shared.RoleTech))
					r.Post("/", assetHandler.HandleCreate)
					r.Patch("/{id}", assetHandler.HandleUpdate)
					r.Delete("/{id}", assetHandler.HandleDelete)
					r.Post("/{id}/submit", assetHandler.HandleSubmit)
				})

				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(shared.RoleAdmin))
					r.Post("/{id}/approve", assetHandler.HandleApprove)
					r.Post("/{id}/reject", assetHandler.HandleReject)
				})
			})

			// Media — TECH e ADMIN fazem upload/delete; todos autenticados podem ver.
			r.Route("/media", func(r chi.Router) {
				r.Get("/{id}", mediaHandler.HandleGet)

				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(shared.RoleAdmin, shared.RoleTech))
					r.Post("/upload-url", mediaHandler.HandleUploadURL)
					r.Post("/{id}/confirm", mediaHandler.HandleConfirm)
					r.Delete("/{id}", mediaHandler.HandleDelete)
				})
			})
		})
	})

	// TODO: registrar rotas de manejos, monitoramentos, sync, etc. nas próximas tasks

	slog.Info("servidor iniciando", "port", cfg.Port, "env", cfg.Env)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal("falha ao iniciar servidor:", err)
	}
}

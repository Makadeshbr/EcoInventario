package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
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
	"github.com/allan/ecoinventario/internal/health"
	"github.com/allan/ecoinventario/internal/manejo"
	"github.com/allan/ecoinventario/internal/media"
	"github.com/allan/ecoinventario/internal/middleware"
	"github.com/allan/ecoinventario/internal/monitoramento"
	"github.com/allan/ecoinventario/internal/organization"
	"github.com/allan/ecoinventario/internal/public"
	"github.com/allan/ecoinventario/internal/shared"
	syncsvc "github.com/allan/ecoinventario/internal/sync"
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
// pelos services de media, manejo e monitoramento — evita import cíclico.
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

// mediaOwnerAdapter adapta media.Repository à interface manejo.MediaChecker.
// Verifica se uma mídia pertence ao asset indicado sem criar dependência circular.
type mediaOwnerAdapter struct {
	repo media.Repository
}

func (a *mediaOwnerAdapter) BelongsToAsset(ctx context.Context, mediaID, assetID, orgID string) (bool, error) {
	m, err := a.repo.FindByID(ctx, mediaID, orgID)
	if err != nil {
		return false, err
	}
	if m == nil {
		return false, nil
	}
	return m.AssetID == assetID, nil
}

// syncDispatcher implementa syncsvc.EntityDispatcher adaptando os services existentes.
type syncDispatcher struct {
	assetSvc         *asset.Service
	manejoSvc        *manejo.Service
	monitoramentoSvc *monitoramento.Service
}

func (d *syncDispatcher) Create(ctx context.Context, entityType string, payload json.RawMessage) (string, time.Time, json.RawMessage, error) {
	switch entityType {
	case "asset":
		var req asset.CreateRequest
		if err := json.Unmarshal(payload, &req); err != nil {
			return "", time.Time{}, nil, err
		}
		resp, err := d.assetSvc.Create(ctx, req)
		if err != nil {
			return "", time.Time{}, nil, err
		}
		data, _ := json.Marshal(resp)
		return resp.ID, resp.UpdatedAt, data, nil
	case "manejo":
		var req manejo.CreateRequest
		if err := json.Unmarshal(payload, &req); err != nil {
			return "", time.Time{}, nil, err
		}
		resp, err := d.manejoSvc.Create(ctx, req)
		if err != nil {
			return "", time.Time{}, nil, err
		}
		data, _ := json.Marshal(resp)
		return resp.ID, resp.UpdatedAt, data, nil
	case "monitoramento":
		var req monitoramento.CreateRequest
		if err := json.Unmarshal(payload, &req); err != nil {
			return "", time.Time{}, nil, err
		}
		resp, err := d.monitoramentoSvc.Create(ctx, req)
		if err != nil {
			return "", time.Time{}, nil, err
		}
		data, _ := json.Marshal(resp)
		return resp.ID, resp.UpdatedAt, data, nil
	default:
		return "", time.Time{}, nil, fmt.Errorf("entity_type desconhecido: %s", entityType)
	}
}

func (d *syncDispatcher) Update(ctx context.Context, entityType, entityID string, payload json.RawMessage) (time.Time, json.RawMessage, error) {
	switch entityType {
	case "asset":
		var raw map[string]json.RawMessage
		if err := json.Unmarshal(payload, &raw); err != nil {
			return time.Time{}, nil, err
		}
		if statusRaw, ok := raw["status"]; ok {
			var status string
			if err := json.Unmarshal(statusRaw, &status); err != nil {
				return time.Time{}, nil, err
			}
			if status == "pending" {
				resp, err := d.assetSvc.Submit(ctx, entityID)
				if err != nil {
					return time.Time{}, nil, err
				}
				current, err := d.assetSvc.GetByID(ctx, entityID)
				if err != nil {
					return time.Time{}, nil, err
				}
				data, _ := json.Marshal(resp)
				return current.UpdatedAt, data, nil
			}
		}
		var req asset.UpdateRequest
		if err := json.Unmarshal(payload, &req); err != nil {
			return time.Time{}, nil, err
		}
		resp, _, err := d.assetSvc.Update(ctx, entityID, req)
		if err != nil {
			return time.Time{}, nil, err
		}
		data, _ := json.Marshal(resp)
		return resp.UpdatedAt, data, nil
	case "manejo":
		var req manejo.UpdateRequest
		if err := json.Unmarshal(payload, &req); err != nil {
			return time.Time{}, nil, err
		}
		resp, err := d.manejoSvc.Update(ctx, entityID, req)
		if err != nil {
			return time.Time{}, nil, err
		}
		data, _ := json.Marshal(resp)
		return resp.UpdatedAt, data, nil
	case "monitoramento":
		var req monitoramento.UpdateRequest
		if err := json.Unmarshal(payload, &req); err != nil {
			return time.Time{}, nil, err
		}
		resp, err := d.monitoramentoSvc.Update(ctx, entityID, req)
		if err != nil {
			return time.Time{}, nil, err
		}
		data, _ := json.Marshal(resp)
		return resp.UpdatedAt, data, nil
	default:
		return time.Time{}, nil, fmt.Errorf("entity_type desconhecido: %s", entityType)
	}
}

func (d *syncDispatcher) GetCurrentState(ctx context.Context, entityType, entityID string) (*time.Time, json.RawMessage, error) {
	switch entityType {
	case "asset":
		resp, err := d.assetSvc.GetByID(ctx, entityID)
		if err != nil || resp == nil {
			return nil, nil, err
		}
		data, _ := json.Marshal(resp)
		return &resp.UpdatedAt, data, nil
	case "manejo":
		resp, err := d.manejoSvc.GetByID(ctx, entityID)
		if err != nil || resp == nil {
			return nil, nil, err
		}
		data, _ := json.Marshal(resp)
		return &resp.UpdatedAt, data, nil
	case "monitoramento":
		resp, err := d.monitoramentoSvc.GetByID(ctx, entityID)
		if err != nil || resp == nil {
			return nil, nil, err
		}
		data, _ := json.Marshal(resp)
		return &resp.UpdatedAt, data, nil
	default:
		return nil, nil, fmt.Errorf("entity_type desconhecido: %s", entityType)
	}
}

// s3Pinger implementa health.StoragePinger usando ObjectExists como probe.
// Se ObjectExists retorna nil error (mesmo com objeto não encontrado), o S3 está acessível.
type s3Pinger struct {
	client media.S3Client
	bucket string
}

func (p *s3Pinger) Ping(ctx context.Context) error {
	_, err := p.client.ObjectExists(ctx, p.bucket, ".health-probe")
	return err
}

func (d *syncDispatcher) Delete(ctx context.Context, entityType, entityID string) error {
	switch entityType {
	case "asset":
		return d.assetSvc.SoftDelete(ctx, entityID)
	case "manejo":
		return d.manejoSvc.SoftDelete(ctx, entityID)
	case "monitoramento":
		return d.monitoramentoSvc.SoftDelete(ctx, entityID)
	default:
		return fmt.Errorf("entity_type desconhecido: %s", entityType)
	}
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
	manejoRepo := manejo.NewRepository(db)
	monitoramentoRepo := monitoramento.NewRepository(db)
	idempotencyRepo := syncsvc.NewIdempotencyRepository(db)
	syncRepo := syncsvc.NewSyncRepository(db)
	publicRepo := public.NewRepository(db)

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

	manejoSvc := manejo.NewService(
		manejoRepo,
		&assetExistsAdapter{repo: assetRepo},
		&mediaOwnerAdapter{repo: mediaRepo},
		auditSvc,
	)

	monitoramentoSvc := monitoramento.NewService(
		monitoramentoRepo,
		&assetExistsAdapter{repo: assetRepo},
		auditSvc,
	)

	syncSvc := syncsvc.NewService(
		idempotencyRepo,
		&syncDispatcher{
			assetSvc:         assetSvc,
			manejoSvc:        manejoSvc,
			monitoramentoSvc: monitoramentoSvc,
		},
		syncRepo,
	)

	publicSvc := public.NewService(publicRepo, s3Client, cfg.S3Bucket)
	healthHandler := health.NewHandler(db, &s3Pinger{client: s3Client, bucket: cfg.S3Bucket})

	// Rate limiters (sliding window in-memory)
	loginLimiter := middleware.NewRateLimiter(5, time.Minute)
	syncLimiter := middleware.NewRateLimiter(30, time.Minute)
	uploadLimiter := middleware.NewRateLimiter(60, time.Minute)
	publicLimiter := middleware.NewRateLimiter(60, time.Minute)
	defaultLimiter := middleware.NewRateLimiter(120, time.Minute)
	_ = defaultLimiter // reservado para uso futuro

	// Cleanup job de idempotency_keys (> 30 dias). Roda a cada 24h.
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			cutoff := time.Now().AddDate(0, 0, -30)
			n, err := idempotencyRepo.Cleanup(context.Background(), cutoff)
			if err != nil {
				slog.Error("sync cleanup: falha ao remover idempotency keys", "error", err)
			} else {
				slog.Info("sync cleanup: idempotency keys removidas", "count", n)
			}
		}
	}()

	// Handlers
	authHandler := auth.NewHandler(authSvc)
	userHandler := user.NewHandler(userSvc)
	assetTypeHandler := assettype.NewHandler(assetTypeSvc)
	assetHandler := asset.NewHandler(assetSvc)
	mediaHandler := media.NewHandler(mediaSvc)
	manejoHandler := manejo.NewHandler(manejoSvc)
	monitoramentoHandler := monitoramento.NewHandler(monitoramentoSvc)
	syncHandler := syncsvc.NewHandler(syncSvc)
	publicHandler := public.NewHandler(publicSvc)

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
		// Rotas públicas de auth — login limitado a 5/min por IP.
		r.Route("/auth", func(r chi.Router) {
			r.With(middleware.RateLimit(loginLimiter, middleware.KeyByIP)).Post("/login", authHandler.HandleLogin)
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
				r.Get("/{asset_id}/manejos", manejoHandler.HandleList)
				r.Get("/{asset_id}/monitoramentos", monitoramentoHandler.HandleList)

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

			// Manejos — leitura para todos, escrita para tech/admin, aprovação para admin.
			r.Route("/manejos", func(r chi.Router) {
				r.Get("/{id}", manejoHandler.HandleGet)

				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(shared.RoleAdmin, shared.RoleTech))
					r.Post("/", manejoHandler.HandleCreate)
					r.Patch("/{id}", manejoHandler.HandleUpdate)
					r.Delete("/{id}", manejoHandler.HandleDelete)
					r.Post("/{id}/submit", manejoHandler.HandleSubmit)
				})

				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(shared.RoleAdmin))
					r.Post("/{id}/approve", manejoHandler.HandleApprove)
					r.Post("/{id}/reject", manejoHandler.HandleReject)
				})
			})

			// Monitoramentos — leitura para todos, escrita para tech/admin, aprovação para admin.
			r.Route("/monitoramentos", func(r chi.Router) {
				r.Get("/{id}", monitoramentoHandler.HandleGet)

				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(shared.RoleAdmin, shared.RoleTech))
					r.Post("/", monitoramentoHandler.HandleCreate)
					r.Patch("/{id}", monitoramentoHandler.HandleUpdate)
					r.Delete("/{id}", monitoramentoHandler.HandleDelete)
					r.Post("/{id}/submit", monitoramentoHandler.HandleSubmit)
				})

				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(shared.RoleAdmin))
					r.Post("/{id}/approve", monitoramentoHandler.HandleApprove)
					r.Post("/{id}/reject", monitoramentoHandler.HandleReject)
				})
			})

			// Sync — rate limit por user; apenas TECH e ADMIN.
			r.Route("/sync", func(r chi.Router) {
				r.Use(middleware.RateLimit(syncLimiter, middleware.KeyByUser))
				r.Use(middleware.RequireRole(shared.RoleAdmin, shared.RoleTech))
				r.Post("/push", syncHandler.HandlePush)
				r.Get("/pull", syncHandler.HandlePull)
			})

			// Media — rate limit por user para upload; todos autenticados podem ver.
			r.Route("/media", func(r chi.Router) {
				r.Get("/{id}", mediaHandler.HandleGet)

				r.Group(func(r chi.Router) {
					r.Use(middleware.RateLimit(uploadLimiter, middleware.KeyByUser))
					r.Use(middleware.RequireRole(shared.RoleAdmin, shared.RoleTech))
					r.Post("/upload-url", mediaHandler.HandleUploadURL)
					r.Post("/{id}/confirm", mediaHandler.HandleConfirm)
					r.Delete("/{id}", mediaHandler.HandleDelete)
				})
			})
		})

		// Health check — público, sem auth.
		r.Get("/health", healthHandler.HandleHealth)

		// Public API — sem autenticação, rate limit por IP.
		r.Route("/public", func(r chi.Router) {
			r.Use(middleware.RateLimit(publicLimiter, middleware.KeyByIP))
			r.Get("/asset-types", publicHandler.HandleListAssetTypes)
			r.Route("/assets", func(r chi.Router) {
				// resolve-qr antes do wildcard {id}
				r.Get("/resolve-qr", publicHandler.HandleResolveQR)
				r.Get("/", publicHandler.HandleListAssets)
				r.Get("/{id}", publicHandler.HandleGetAsset)
			})
		})
	})

	slog.Info("servidor iniciando", "port", cfg.Port, "env", cfg.Env)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal("falha ao iniciar servidor:", err)
	}
}

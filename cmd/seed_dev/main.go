// Seed de desenvolvimento — popula o banco com usuários, assets e mídias de exemplo.
// Uso: go run ./cmd/seed_dev/
// Idempotente: pode rodar múltiplas vezes sem duplicar dados.
package main

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/allan/ecoinventario/internal/assettype"
	"github.com/allan/ecoinventario/internal/audit"
	"github.com/allan/ecoinventario/internal/config"
	"github.com/allan/ecoinventario/internal/shared"
	"github.com/allan/ecoinventario/internal/user"
	"github.com/joho/godotenv"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	_ "github.com/jackc/pgx/v5/stdlib"
)

const defaultOrgID = "00000000-0000-0000-0000-000000000001"

// sampleKey é o caminho usado tanto no DB quanto no MinIO.
const sampleKey = "samples/tree.jpg"

// sampleImageURL retorna sempre a mesma imagem (seed "tree") via picsum.photos.
const sampleImageURL = "https://picsum.photos/seed/tree/400/400"

func main() {
	_ = godotenv.Load(".env")
	cfg := config.MustLoad()

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("banco:", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatal("ping:", err)
	}

	auditRepo := audit.NewRepository(db)
	auditSvc := audit.NewService(auditRepo)
	userRepo := user.NewRepository(db)
	userSvc := user.NewService(userRepo, auditSvc, cfg.PasswordPepper)
	assetTypeRepo := assettype.NewRepository(db)
	assetTypeSvc := assettype.NewService(assetTypeRepo, auditSvc)

	// Contexto fake para operações de seed (org padrão, user "sistema")
	ctx := shared.WithOrgID(context.Background(), defaultOrgID)
	ctx = shared.WithUserID(ctx, "00000000-0000-0000-0000-000000000000")

	fmt.Println("── Usuários ─────────────────────────────")

	adminID := seedUser(ctx, userSvc, user.CreateRequest{
		Name:     "Admin Dev",
		Email:    "admin@ecoinventario.com",
		Password: "SenhaForte123",
		Role:     shared.RoleAdmin,
	})
	fmt.Printf("  Admin     admin@ecoinventario.com / SenhaForte123  (id: %s)\n", adminID)

	techID := seedUser(ctx, userSvc, user.CreateRequest{
		Name:     "Tech Dev",
		Email:    "tech@ecoinventario.com",
		Password: "SenhaForte123",
		Role:     shared.RoleTech,
	})
	fmt.Printf("  Manejador tech@ecoinventario.com  / SenhaForte123  (id: %s)\n", techID)

	fmt.Println("── Tipos de ativo ───────────────────────")

	arvoreID := seedAssetType(ctx, assetTypeSvc, "Árvore Nativa")
	fmt.Printf("  Árvore Nativa  (id: %s)\n", arvoreID)

	arbustoID := seedAssetType(ctx, assetTypeSvc, "Arbusto")
	fmt.Printf("  Arbusto        (id: %s)\n", arbustoID)

	fmt.Println("── Imagem de exemplo (MinIO) ────────────")
	ensureSampleImage(cfg)

	fmt.Println("── Assets aprovados (visíveis no mapa) ──")

	type sample struct{ lat, lng float64; typeID, notes string }
	samples := []sample{
		{lat: -15.7801, lng: -47.9292, typeID: arvoreID, notes: "Ipê Amarelo — Parque da Cidade, Brasília"},
		{lat: -15.7934, lng: -47.8822, typeID: arvoreID, notes: "Mangabeira — Lago Sul, Brasília"},
		{lat: -15.7642, lng: -48.0110, typeID: arbustoID, notes: "Murici — Ceilândia, Brasília"},
	}

	for _, s := range samples {
		id := insertApprovedAsset(db, s.lat, s.lng, s.typeID, s.notes, techID, adminID)
		insertSampleMedia(db, id, adminID, cfg.S3Bucket)
		fmt.Printf("  %-45s  lat=%.4f lng=%.4f  (id: %s)\n", s.notes, s.lat, s.lng, id)
	}

	fmt.Println()
	fmt.Println("══════════════════════════════════════════════")
	fmt.Println("  Credenciais de desenvolvimento:")
	fmt.Println("  Admin     → admin@ecoinventario.com / SenhaForte123")
	fmt.Println("  Manejador → tech@ecoinventario.com  / SenhaForte123")
	fmt.Println("══════════════════════════════════════════════")
}

// ensureSampleImage garante que samples/tree.jpg existe no bucket S3 configurado.
// Cria o bucket se necessário. Faz download de uma imagem pública se o objeto não existir.
// Não fatal: um aviso é logado se o MinIO não estiver acessível.
func ensureSampleImage(cfg *config.Config) {
	endpoint := cfg.S3Endpoint
	endpoint = strings.TrimPrefix(endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")

	mc, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.S3AccessKey, cfg.S3SecretKey, ""),
		Secure: false,
	})
	if err != nil {
		log.Printf("  AVISO MinIO inacessível: %v — imagem não carregada", err)
		return
	}

	ctx := context.Background()
	bucket := cfg.S3Bucket

	// Cria o bucket se ainda não existir
	exists, err := mc.BucketExists(ctx, bucket)
	if err != nil {
		log.Printf("  AVISO verificando bucket: %v", err)
		return
	}
	if !exists {
		if err := mc.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			log.Printf("  AVISO criando bucket %q: %v", bucket, err)
			return
		}
		fmt.Printf("  Bucket %q criado\n", bucket)
	}

	// Verifica se o objeto já existe (idempotente)
	_, err = mc.StatObject(ctx, bucket, sampleKey, minio.StatObjectOptions{})
	if err == nil {
		fmt.Printf("  Imagem de exemplo já existe em %s/%s\n", bucket, sampleKey)
		return
	}

	// Faz download da imagem pública
	resp, err := http.Get(sampleImageURL)
	if err != nil {
		log.Printf("  AVISO download da imagem falhou: %v\n  Suba manualmente: %s/%s", err, bucket, sampleKey)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("  AVISO download retornou HTTP %d — suba manualmente: %s/%s", resp.StatusCode, bucket, sampleKey)
		return
	}

	// Lê para buffer para obter o tamanho real (Content-Length pode ser -1)
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("  AVISO lendo imagem: %v", err)
		return
	}

	_, err = mc.PutObject(
		ctx, bucket, sampleKey,
		bytes.NewReader(data), int64(len(data)),
		minio.PutObjectOptions{ContentType: "image/jpeg"},
	)
	if err != nil {
		log.Printf("  AVISO upload para MinIO: %v", err)
		return
	}
	fmt.Printf("  Imagem de exemplo carregada → %s/%s (%d bytes)\n", bucket, sampleKey, len(data))
}

// insertSampleMedia insere registro de mídia apontando para a imagem de exemplo no MinIO.
func insertSampleMedia(db *sql.DB, assetID, userID, bucket string) {
	_, _ = db.Exec(`
		INSERT INTO media (
			organization_id, asset_id, storage_key, storage_bucket,
			mime_type, size_bytes, type, upload_status, created_by
		) VALUES ($1, $2, $3, $4, 'image/jpeg', 1024, 'general', 'uploaded', $5)`,
		defaultOrgID, assetID, sampleKey, bucket, userID)
}

// seedUser cria o usuário ou retorna o ID existente.
func seedUser(ctx context.Context, svc *user.Service, req user.CreateRequest) string {
	resp, err := svc.Create(ctx, req)
	if err == nil {
		return resp.ID
	}
	list, lerr := svc.List(ctx, user.ListFilters{})
	if lerr != nil {
		return "erro"
	}
	for _, u := range list.Data {
		if u.Email == req.Email {
			return u.ID
		}
	}
	return "não-encontrado"
}

// seedAssetType cria o tipo ou retorna o ID existente pelo nome.
func seedAssetType(ctx context.Context, svc *assettype.Service, name string) string {
	resp, err := svc.Create(ctx, assettype.CreateRequest{Name: name})
	if err == nil {
		return resp.ID
	}
	list, lerr := svc.List(ctx)
	if lerr != nil {
		return "erro"
	}
	for _, t := range list {
		if t.Name == name {
			return t.ID
		}
	}
	return "não-encontrado"
}

// insertApprovedAsset insere diretamente no banco um asset já aprovado.
func insertApprovedAsset(
	db *sql.DB,
	lat, lng float64,
	assetTypeID, notes, createdBy, approvedBy string,
) string {
	qrCode := fmt.Sprintf("DEV-%d", time.Now().UnixNano())
	var id string
	err := db.QueryRow(`
		INSERT INTO assets (
			organization_id, asset_type_id, location, qr_code,
			status, version, notes, created_by, approved_by
		) VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, 'approved', 1, $6, $7, $8)
		RETURNING id`,
		defaultOrgID, assetTypeID, lng, lat, qrCode,
		notes, createdBy, approvedBy,
	).Scan(&id)
	if err != nil {
		log.Printf("WARN asset: %v", err)
		return "erro"
	}
	return id
}

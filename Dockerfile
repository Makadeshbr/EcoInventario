# ── Build stage ──────────────────────────────────────────────────────────────
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git tzdata

WORKDIR /app

# Baixa dependências primeiro (cache layer separado)
COPY go.mod go.sum ./
RUN go mod download

# Copia e compila apenas o binário do servidor
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/server ./cmd/server/main.go

# ── Run stage (imagem mínima e segura) ───────────────────────────────────────
FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata curl

# Instala o golang-migrate CLI para rodar as migrations no startup
RUN curl -sSL \
    https://github.com/golang-migrate/migrate/releases/download/v4.18.1/migrate.linux-amd64.tar.gz \
    | tar xz -C /usr/local/bin \
    && chmod +x /usr/local/bin/migrate

WORKDIR /app

# Copia binário do servidor e pasta de migrations
COPY --from=builder /app/bin/server /app/server
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

# Aplica migrations e sobe o servidor
CMD ["sh", "-c", "migrate -path /app/migrations -database \"$DATABASE_URL\" up && /app/server"]

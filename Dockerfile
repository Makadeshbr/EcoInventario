# Build stage
FROM golang:1.22-alpine AS builder

# Instala dependências do SO necessárias para o build
RUN apk add --no-cache git tzdata

WORKDIR /app

# Baixa as dependências do Go primeiro (cache layer)
COPY go.mod go.sum ./
RUN go mod download

# Copia o resto do código
COPY . .

# Compila o binário estático
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/server ./cmd/server/main.go
# Compila o binário de migrations (para rodar no startup)
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/migrate ./cmd/migrate/main.go

# Run stage (imagem mínima e segura)
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copia os binários e a pasta de migrations do builder
COPY --from=builder /app/bin/server /app/server
COPY --from=builder /app/bin/migrate /app/migrate
COPY --from=builder /app/migrations ./migrations

# Expõe a porta que o Render vai usar
EXPOSE 8080

# Script de entrypoint: roda as migrations e depois sobe a API
CMD ["sh", "-c", "/app/migrate up && /app/server"]

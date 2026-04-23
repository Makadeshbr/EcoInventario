# TODO: Sem teste — config/infra
include .env
export

.PHONY: run migrate-up migrate-down migrate-create test

run:
	go run ./cmd/server/main.go

migrate-up:
	go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate \
		-path ./migrations \
		-database "$(DATABASE_URL)" \
		-verbose up

migrate-down:
	go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate \
		-path ./migrations \
		-database "$(DATABASE_URL)" \
		-verbose down -all

migrate-create:
	@read -p "Nome da migration: " name; \
	go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate \
		create -ext sql -dir ./migrations -seq "$$name"

test:
	go test ./... -v -count=1 -race

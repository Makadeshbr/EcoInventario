# ROADMAP.md - Fases e Escopo

> **Proposito:** Define o que esta no escopo de cada fase e o que esta explicitamente fora.
> A IA deve verificar este arquivo para nao implementar features de fases futuras.

---

## Fase 1 - MVP

**Objetivo:** sistema funcional end-to-end para inventario de ativos com sync offline, aprovacao, modo visitante e operacoes de campo completas.

### Backend
- [ ] Setup do projeto Go (chi, pgx, golang-migrate)
- [ ] Docker Compose (PostgreSQL + PostGIS + MinIO)
- [ ] Migrations: todas as tabelas do DATABASE.md
- [ ] Config: carrega e valida env vars no startup
- [ ] Middleware: auth (JWT), RBAC, rate limit, request_id, logging, recover, security headers
- [ ] Auth: login, refresh (com rotation), logout
- [ ] Password hashing: Argon2id + pepper
- [ ] CRUD Organizations (seed inicial)
- [ ] CRUD Users (ADMIN only)
- [ ] CRUD Asset Types (ADMIN only)
- [ ] CRUD Assets + fluxo de aprovacao (submit/approve/reject)
- [ ] CRUD Manejos + fluxo de aprovacao
- [ ] CRUD Monitoramentos + fluxo de aprovacao
- [ ] Versionamento de assets aprovados (nova versao ao editar)
- [ ] Upload de midia via presigned URL + confirm
- [ ] Sync push (com idempotencia e deteccao de conflito)
- [ ] Sync pull (delta sync com since + cursor)
- [ ] Audit log automatico em toda operacao
- [ ] Endpoints publicos (asset types, mapa, ficha publica, QR resolve)
- [ ] Health check endpoint
- [ ] Rate limiting
- [ ] Endpoint de stats para home do dashboard
- [ ] Structured logging (slog, JSON)
- [ ] Busca por proximidade (nearby) com PostGIS

### Mobile
- [ ] Setup Expo SDK 52 + Expo Router 4
- [ ] SQLite setup + migrations locais
- [ ] Tela de login para TECH
- [ ] Auth store (MMKV + Zustand)
- [ ] API client (ky) com interceptor de auth
- [ ] Modo visitante: welcome, mapa, ficha publica, scanner QR, sobre
- [ ] Lista de assets (local + synced)
- [ ] Criar asset (formulario + GPS + camera)
- [ ] Detalhes do asset
- [ ] Galeria de fotos do asset
- [ ] QR Code (geracao no device)
- [ ] QR Code scan no mobile
- [ ] Criar manejo
- [ ] Criar monitoramento
- [ ] Sync engine: push metadados
- [ ] Sync engine: push midia (fila separada)
- [ ] Sync engine: pull atualizacoes
- [ ] Deteccao de conflito + tela de resolucao
- [ ] Indicador de status de sync na UI
- [ ] Compressao de imagens antes do upload
- [ ] Network status monitoring

### Dashboard
- [ ] Setup Next.js 15 + Tailwind
- [ ] Tela de login
- [ ] Layout com sidebar
- [ ] Dashboard home (metricas + graficos simples)
- [ ] Fila de aprovacao (aprovar/rejeitar com motivo)
- [ ] Lista de assets (tabela + filtros)
- [ ] Detalhes do asset (dados + fotos + mapa)
- [ ] Lista de manejos
- [ ] Lista de monitoramentos
- [ ] Mapa interativo com clusters
- [ ] CRUD de usuarios
- [ ] CRUD de asset types
- [ ] Consulta de audit logs
- [ ] Mapa publico web

---

## Fase 2

**Objetivo:** refinamentos operacionais, comunicacao com usuarios e ergonomia.

- [ ] Notificacoes push ao TECH quando registro e aprovado/rejeitado
- [ ] Acoes em lote no dashboard (aprovar/rejeitar multiplos registros)
- [ ] Busca global por QR code / identificador em todo o dashboard
- [ ] Filtros salvos e preferencias de visualizacao
- [ ] Melhorias de UX para resolucao de conflitos no mobile

---

## Fase 3

**Objetivo:** relatorios, otimizacoes e observabilidade avancada.

- [ ] Relatorios PDF (resumo por periodo, por tipo, por tecnico)
- [ ] Exportacao CSV com filtros
- [ ] CDN para mapa publico (cache na edge)
- [ ] Redis para rate limiting distribuido e cache
- [ ] Read replicas do PostgreSQL para dashboard
- [ ] Otimizacao de sync (compressao gzip, sync parcial por area geografica)
- [ ] Particionamento de audit_logs por mes
- [ ] Dashboard: graficos e analytics avancados
- [ ] Dashboard: exportacao de relatorios

---

## Nao-Objetivos (fora de todas as fases atuais)

- Machine Learning / analise preditiva
- Microservices (monolito modular e suficiente)
- Event sourcing completo
- PWA para o mobile (e app nativo via Expo)
- Integracao com APIs de terceiros (governo etc.)
- Suporte a multiplos idiomas (i18n)
- Chat ou mensageria entre usuarios
- Modo offline para o dashboard
- App desktop

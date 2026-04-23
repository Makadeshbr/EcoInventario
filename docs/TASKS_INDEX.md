# TASKS INDEX — 18 Tasks para 100% do App

> Ordem de execução: T01 → T18. Cada task depende das anteriores.
> A IA lê: `RULES.md` + o arquivo da task + o doc de referência indicado.

## ⚠️ Obrigatório em TODA task: TDD

**Fluxo por task:**
1. **Red** → Escreva os testes descrevendo o comportamento esperado (devem falhar).
2. **Green** → Implemente o mínimo para os testes passarem.
3. **Refactor** → Limpe o código mantendo os testes verdes.

**Estrutura esperada por task:**
```
### Suposições       ← liste o que foi assumido
### Testes           ← código completo dos testes (obrigatório)
### Implementação    ← código completo, pronto para produção
### Débitos Aceitos  ← TODO: [descrição + motivo], se houver
```

**Exceções aceitas para pular Testes:**
- Config pura (env, docker-compose, CI/CD) — registre `// TODO: Sem teste — config pura`
- Seed/migration única — registre `// TODO: Sem teste — script descartável`

---

## Backend (T01–T08)
- [x] **T01** Setup + Migrations + Config + Shared + Middleware
- [x] **T02** Auth completo (Argon2id, JWT, login/refresh/logout, RBAC)
- [x] **T03** Organizations + Users + Asset Types (CRUD admin)
- [ ] **T04** Assets completo (CRUD + aprovação + versionamento + nearby)
- [ ] **T05** Media (presigned URL + upload + confirm)
- [ ] **T06** Manejos + Monitoramentos (CRUD + aprovação)
- [ ] **T07** Sync Engine (push + pull + idempotência + conflito)
- [ ] **T08** Public API + Health Check + Rate Limiting

## Mobile (T09–T14)
- [ ] **T09** Setup + Tipos + API Client + Auth Store + Navegação
- [ ] **T10** Splash + Welcome + Login
- [ ] **T11** Modo Visitante (mapa + ficha + scanner + sobre)
- [ ] **T12** Profissional: Home + Assets (lista + criar + detalhes + editar)
- [ ] **T13** Profissional: Criar Manejo + Criar Monitoramento
- [ ] **T14** Sync Engine + Media Queue + Conflitos + Perfil + Config

## Dashboard (T15–T18)
- [ ] **T15** Setup + Layout + Auth + Home
- [ ] **T16** Aprovação + Assets (lista + detalhes) + Mapa
- [ ] **T17** Manejos + Monitoramentos (listas)
- [ ] **T18** Usuários + Tipos + Auditoria + Mapa Público
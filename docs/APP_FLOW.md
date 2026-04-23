# APP_FLOW.md - Fluxo do App e Mapa de Telas

> **Proposito:** Fluxo completo de navegacao, todas as telas, e escopo por fase.
> A IA consulta este arquivo para saber quais telas existem, como o usuario navega,
> e o que esta no escopo da fase atual.

---

## 1. Visao Geral dos Produtos

| Produto | Plataforma | Usuarios | Funcionalidade principal |
| ------- | ---------- | -------- | ------------------------ |
| **Mobile App** | iOS/Android (Expo) | Visitantes (sem conta), TECH | Explorar ativos ambientais (visitante) + coleta de dados (profissional) |
| **Dashboard** | Web (Next.js) | ADMIN, TECH, VIEWER | Aprovacao, gestao e relatorios |
| **Mapa Publico** | Web (rota publica) | Qualquer pessoa | Visualizacao web de dados aprovados |

**Dois modos no mobile:**
- **Modo Visitante** - sem login, qualquer pessoa. Explora o mapa, escaneia QR e ve fichas completas dos ativos aprovados.
- **Modo Profissional** - com login (`tech`). Coleta de dados em campo, sync offline e envio para aprovacao.

**Admin no mobile?** Nao. Aprovacao, gestao de usuarios e relatorios ficam no dashboard web.
Se um usuario `admin` tentar usar o app mobile no MVP, o app deve orienta-lo a usar o dashboard.

**Cadastro publico?** Nao para modo profissional. ADMIN cria contas pelo dashboard. O modo visitante nao exige conta.

---

## 2. Mobile App - Fluxo Completo

### 2.1 Fluxo de Navegacao

```text
[Splash Screen]
      |
      v
   Tem token salvo?
      |
  +---+--------------+
  |                  |
 NAO                SIM (token valido)
  |                  |
  v                  v
[Boas-vindas]      [Home Profissional]
  |
  +--- "Explorar" --> [Modo Visitante]
  |
  +--- "Entrar" ----> [Login]
                         |
                         v
                    [Home Profissional]
```

**Transicao entre modos:**
- No modo visitante, um botao "Sou profissional" leva para a tela de login.
- Apos login com `tech`, o usuario entra no modo profissional.
- Apos logout, volta para a tela de boas-vindas.
- Login com `admin` ou `viewer` deve ser bloqueado no mobile com orientacao para usar o dashboard web.

---

### 2.2 Mapa de Telas - Modo Visitante (6 telas)

> Sem login. Dados da API publica. Apenas assets, manejos e monitoramentos com status `approved`.

| # | Tela | Rota | Descricao | Fase |
| - | ---- | ---- | --------- | ---- |
| 1 | **Splash Screen** | - | Logo + loading. Verifica token salvo. Token valido -> Home Profissional. Sem token -> Boas-vindas. | 1 |
| 2 | **Boas-vindas** | `(welcome)/index` | Branding do app. Dois botoes: **Explorar** e **Entrar**. | 1 |
| 3 | **Mapa Explorar** | `(guest)/(map)/index` | Mapa interativo com markers dos assets aprovados, clusters, filtros por tipo e localizacao do usuario. | 1 |
| 4 | **Ficha do Asset (publica)** | `(guest)/(map)/asset/[id]` | Ficha completa do ativo: tipo, fotos, mapa, historico de manejos e monitoramentos. Sem dados internos. | 1 |
| 5 | **Scanner QR (visitante)** | `(guest)/(scanner)/index` | Camera para escanear QR. Se aprovado, abre ficha publica. | 1 |
| 6 | **Sobre** | `(guest)/(about)/index` | Informacoes do app, contato, versao e CTA para login profissional. | 1 |

---

### 2.3 Mapa de Telas - Modo Profissional (15 telas)

> Com login (`tech`). Acesso aos dados necessarios para operacao de campo + funcionalidade offline.

| # | Tela | Rota | Descricao | Fase |
| - | ---- | ---- | --------- | ---- |
| 7 | **Login** | `(auth)/login` | Email + senha. Sem cadastro. Link voltar para Boas-vindas. | 1 |
| 8 | **Home** | `(app)/(home)/index` | Resumo com assets recentes, status do sync e contadores. | 1 |
| 9 | **Lista de Assets** | `(app)/(assets)/index` | Lista com filtros, pull-to-refresh, FAB criar e badge de nao sincronizado. | 1 |
| 10 | **Criar Asset** | `(app)/(assets)/new` | Multi-step: tipo/notas, GPS, fotos, revisao e salvar. QR gerado automaticamente. | 1 |
| 11 | **Detalhes do Asset** | `(app)/(assets)/[id]` | Dados completos, galeria, mapa, status e envio para aprovacao. | 1 |
| 12 | **Editar Asset** | `(app)/(assets)/[id]/edit` | Formulario preenchido. So para status `draft` ou `rejected` e usuario dono. | 1 |
| 13 | **Criar Manejo** | `(app)/(assets)/[id]/manejo` | Descricao + foto antes + foto depois. Vinculado ao asset. | 1 |
| 14 | **Criar Monitoramento** | `(app)/(assets)/[id]/monitoramento` | Notas + health status. Vinculado ao asset. | 1 |
| 15 | **Scanner QR (profissional)** | `(app)/(scanner)/index` | Le QR e abre detalhes do asset profissional. Busca local primeiro e servidor depois. | 1 |
| 16 | **Perfil** | `(app)/(profile)/index` | Nome, email, role, organizacao. Botoes Sync, Configuracoes e Logout. | 1 |
| 17 | **Sync Status** | `(app)/(profile)/sync` | Filas, uploads pendentes, ultimo sync e CTA para sincronizar agora. | 1 |
| 18 | **Conflitos** | `(app)/(profile)/conflicts` | Lista de conflitos entre versao local e servidor. | 1 |
| 19 | **Detalhes do Conflito** | `(app)/(profile)/conflicts/[id]` | Side-by-side com resolucao por aceitar servidor, reenviar ou merge. | 1 |
| 20 | **Configuracoes** | `(app)/(profile)/settings` | Qualidade da foto, intervalo de sync e limpar cache. | 1 |
| 21 | **Sobre (profissional)** | `(app)/(profile)/about` | Versao, organizacao e suporte. | 1 |

---

### 2.4 Navegacao - Expo Router

```text
app/
|-- _layout.tsx
|-- (welcome)/
|   |-- _layout.tsx
|   `-- index.tsx
|-- (guest)/
|   |-- _layout.tsx
|   |-- (map)/
|   |   |-- _layout.tsx
|   |   |-- index.tsx
|   |   `-- asset/
|   |       `-- [id].tsx
|   |-- (scanner)/
|   |   `-- index.tsx
|   `-- (about)/
|       `-- index.tsx
|-- (auth)/
|   |-- _layout.tsx
|   `-- login.tsx
`-- (app)/
    |-- _layout.tsx
    |-- (home)/
    |   `-- index.tsx
    |-- (assets)/
    |   |-- _layout.tsx
    |   |-- index.tsx
    |   |-- new.tsx
    |   `-- [id]/
    |       |-- index.tsx
    |       |-- edit.tsx
    |       |-- manejo.tsx
    |       `-- monitoramento.tsx
    |-- (scanner)/
    |   `-- index.tsx
    `-- (profile)/
        |-- _layout.tsx
        |-- index.tsx
        |-- sync.tsx
        |-- conflicts/
        |   |-- index.tsx
        |   `-- [id].tsx
        |-- settings.tsx
        `-- about.tsx
```

### 2.5 Tab Bars

**Modo Visitante (3 tabs):**

| Tab | Icone | Tela principal |
| --- | ----- | -------------- |
| Mapa | map | Mapa Explorar |
| Scanner | qr-code | Scanner QR |
| Sobre | info | Sobre o app |

**Modo Profissional (4 tabs):**

| Tab | Icone | Tela principal | Badge |
| --- | ----- | -------------- | ----- |
| Home | house | Home | - |
| Assets | tree | Lista de Assets | Numero de assets nao synced |
| Scanner | qr-code | Scanner QR | - |
| Perfil | user | Perfil | Numero de conflitos pendentes |

### 2.6 Estados de UI por Tela

Cada tela deve tratar estes estados:

| Estado | Quando |
| ------ | ------ |
| Loading | Carregando dados |
| Empty | Sem dados para exibir |
| Error | Falha ao carregar |
| Offline | Sem conexao |
| Content | Dados carregados normalmente |

**Visitante offline:** depende de internet para buscar dados. Nao ha cache offline para visitantes no MVP.

---

## 3. Dashboard Web - Fluxo Completo

### 3.1 Fluxo de Navegacao

```text
[Login]
   |
   v
[Dashboard Home]
   |
   +-- Sidebar fixa:
       |-- Home
       |-- Aprovacao (ADMIN only)
       |-- Assets
       |-- Manejos
       |-- Monitoramentos
       |-- Mapa
       |-- Usuarios (ADMIN only)
       |-- Tipos de Asset (ADMIN only)
       |-- Auditoria (ADMIN only)
       `-- Relatorios (Fase 3)
```

### 3.2 Mapa de Telas - Dashboard (12 telas)

| # | Tela | Rota | Role | Fase | Descricao |
| - | ---- | ---- | ---- | ---- | --------- |
| 1 | **Login** | `/login` | Todos | 1 | Email + senha |
| 2 | **Home** | `/dashboard` | Todos | 1 | Metricas e graficos simples para resumo operacional. |
| 3 | **Fila de Aprovacao** | `/dashboard/approval` | ADMIN | 1 | Registros pending com acoes inline de aprovar/rejeitar. |
| 4 | **Assets Lista** | `/dashboard/assets` | Todos | 1 | Tabela paginada com filtros, busca por QR code e toggle lista/mapa. |
| 5 | **Asset Detalhes** | `/dashboard/assets/[id]` | Todos | 1 | Dados completos, fotos, mapa, historico, manejos, monitoramentos e audit log. |
| 6 | **Manejos** | `/dashboard/manejos` | Todos | 1 | Tabela paginada com fotos before/after side-by-side. |
| 7 | **Monitoramentos** | `/dashboard/monitoramentos` | Todos | 1 | Tabela paginada com health status visual. |
| 8 | **Mapa** | `/dashboard/map` | Todos | 1 | Mapa interativo com clusters e filtros. |
| 9 | **Usuarios** | `/dashboard/users` | ADMIN | 1 | CRUD de usuarios da organizacao. |
| 10 | **Tipos de Asset** | `/dashboard/asset-types` | ADMIN | 1 | CRUD de tipos de asset. |
| 11 | **Auditoria** | `/dashboard/audit` | ADMIN | 1 | Tabela de audit logs com filtros e diff. |
| 12 | **Relatorios** | `/dashboard/reports` | ADMIN | 3 | Exportacao CSV/PDF com filtros. |

### 3.3 Visibilidade por Role

| Tela | ADMIN | TECH | VIEWER |
| ---- | ----- | ---- | ------ |
| Home | sim | sim | sim (approved only) |
| Fila de Aprovacao | sim | nao | nao |
| Assets | sim | sim | sim (approved only) |
| Manejos | sim | sim | sim (approved only) |
| Monitoramentos | sim | sim | sim (approved only) |
| Mapa | sim | sim | sim (approved only) |
| Usuarios | sim | nao | nao |
| Tipos de Asset | sim | nao | nao |
| Auditoria | sim | nao | nao |
| Relatorios | sim | nao | nao |

---

## 4. Mapa Publico Web (1 tela)

| Tela | Rota | Auth | Fase | Descricao |
| ---- | ---- | ---- | ---- | --------- |
| Mapa Publico | `/public` | Sem auth | 1 | Mapa web com assets approved only. Mesmo conteudo do modo visitante mobile. Cache CDN 5 min. |

---

## 5. Contagem Total de Telas

| Produto | Telas | Fase 1 |
| ------- | ----- | ------ |
| Mobile - Visitante | 6 | 6 |
| Mobile - Profissional | 15 | 15 |
| Dashboard | 12 | 11 (+1 F3) |
| Mapa Publico Web | 1 | 1 |
| **Total** | **34** | **33** |

---

## 6. Roadmap por Fase

### Fase 1 - MVP (33 telas)

**Backend:**
- Auth (login, refresh, logout)
- CRUD: organizations, users, asset types, assets, manejos, monitoramentos, media
- Fluxo de aprovacao (submit/approve/reject)
- Sync engine (push/pull com conflito)
- Audit log automatico
- Endpoints publicos (mapa, detalhes completos com manejos/monitoramentos, QR resolve)
- Health check + rate limit + structured logging + stats do dashboard

**Mobile - Visitante:**
- Splash, Boas-vindas, Mapa explorar, Ficha publica completa, Scanner QR, Sobre

**Mobile - Profissional:**
- Login TECH, Home, CRUD assets, fotos, GPS, QR generation, Sync engine, Conflitos, Perfil
- Criar manejo, Criar monitoramento

**Dashboard:**
- Login, Home, Aprovacao, Assets, Manejos, Monitoramentos, Mapa, Usuarios, Tipos, Auditoria

**Web:**
- Mapa publico

### Fase 2
- Notificacoes push (aprovacao/rejeicao)
- Melhorias operacionais e ergonomia

### Fase 3
- Relatorios PDF/CSV
- CDN, Redis, read replicas, analytics avancados e otimizacao de sync

### Fora de escopo
Machine Learning, microservices, event sourcing, PWA, i18n, chat entre usuarios, app desktop, modo offline para visitante, cadastro publico de contas.

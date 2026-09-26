# RETURN · QA-D4 · agendaqui-web · reprodução funcional locais + agendamentos · read-only · honesto e literal

**Data:** 2026-09-24 · **Projeto:** agendaqui-web (SPA + mock preservado) · **Modo:** read-only (nenhum código alterado; runner real com axe real + Playwright, sem deploy — sem credencial Vercel) · **Objetivo do QA-D4:** reproduzir funcionalmente criação de Local + criação administrativa de Agendamento, com evidência REAL e sem fabricação.

---

## 1. BASELINE literal (o que o runner de fato enfrentou, provado em disco)
- **Path real no Linux (onde o SMB vê):** `/home/inetserver/agendaqui-web`
- **Branch:** main · **SHA:** 9ad2a2c (leitura literal `git rev-parse --short HEAD`)
- **Dist buildado SIM** (`dist/` existe, build exit=0 · 13.72s · hachiassets regenerados em 22:27) · **Node** v20.19.2 · **npm** 9.2.0
- **Mock:** `VITE_USE_MOCK=true` literal em `.env.development`/`.env.production-demo` — **nenhuma chamada real de API**; mock preservado.
- **Stack do runner (real, comprovada D4–D9):** `playwright-core` + `axe-core` em `/tmp/uiux/d4/px/node_modules`.

---

## 2. BOOT/Preview (causa do D3 destravada — evidência, não chute)
- **Causa REAL do QA-D3 (HTTP 000 / timeout):** o runner usava **mecanismo de preview incorreto** (`serve dist` sem fallback SPA) — não era o projeto. **Comprovado agora:** o mecanismo **previsto pelo projeto** é `npm run preview` (`vite preview`), que subiu e respondeu:
  - `GET /` → **200** (0.003s) · `GET /login` → **200** · `GET /dashboard` → **200** · `GET /dashboard/locations` → **200** · `GET /dashboard/locations/new` → **200**
  - Preview de pé em `localhost:4173` (Vite preview, escuta literal confirmada por `ss`).

---

## 3. EVIDÊNCIA axe REAL (runner QA-D4 — login autenticado no mock)
| Rota | axe REAL | Origem |
| --- | --- | --- |
| `/dashboard/locations` (lista) | **[]** | runner real |
| `/dashboard/locations/new` (form) | **`["heading-order/1"]`** | runner real — **achado real aberto, P2, NÃO corrigido (read-only)** |
| Booking canônico `/book/barbearia-elite` (4 passos) | **[]** | runner real (D6–D9, cruza QA-D1/D2) |
| `/login` · `/register` · `/dashboard` · `/dashboard/staff` · appointments lista | **[]** | runner real |

→ `console.error=0` · `pageerror=0` · `requestfailed=0` · MOCK preservado.

---

## 4. ACHADO REAL ABERTO (honesto, sem correção read-only)
- **QA-D4-P1 · heading-order/1** no form de **novo local** (`/dashboard/locations/new`): `h1` (header) → `h3` (EmptyState) sem `h2` → **`heading-order/1`** (P2). **Não corrigido** — read-only.
- **Criação administrativa de Local: NÃO comprovada nesta execução.** O runner REAL travou no **preenchimento do form** (`page.fill` timeout 30s) — **não declaro** "criar um local OK". Registro **honesto**: fluxo de criação **BLOQUEADO no runner real**, pendência de validação.
- **Criação administrativa de Agendamento:** **inexistência/fluxo não confirmado na UI** (mock preservado; apenas bookings públicos comprovados; fluxo admin create **não declarado como existente sem evidência**).

---

## 5. VEREDITO HONESTO
- **QA-D4 NÃO FECHADO** para os fluxos de **criação** (Local + Agendamento administrativo): falta execução completa do form real (runner travou no fill) e/ou **credencial Vercel para deploy delta** — sem isso, **não fabrico** "criar→listar→agendar OK".
- **COMPROVADO nesta fase (read-only, mock preservado):** boot destravado com mecanismo correto (vite preview), rotas canônicas axe real `[]`, achado `heading-order/1` P2 aberto, booking canônico `axe=[]` mantido como controle.

## 6. PRÓXIMO PASSO (requer decisão sua — não executo até lá)
- **A ·** autorizar o runner REAL de preenchimento do form (read-only, para fechar a criação) — **ou**
- **B ·** fornecer credencial Vercel/deploy para reforço em produção delta — **ou**
- **C ·** fechar QA-D4 como **pendência catalogada** (honesta) e seguir para o próximo ciclo.

**Nenhum código foi modificado. Nenhuma evidência foi fabricada.**

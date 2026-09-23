# Relatório de Decisões — EOB · Fase 0 (Frontend Agendaqui)

> **De:** Frontend Agendaqui · **Para:** EOB (Engineer of Backend) / Owner
> **Escopo circundado neste relatório:** Decisões D1–D6 (Fase 0). Não cobre Fases 1–5.
> **Método:** validação ao vivo contra `https://agendaqui-api.onrender.com` (sem assinatura
> de contrato local disponível). Contratos obtidos por chamadas reais (curl), não por spec.

---

## Veredito Estratégico

**A premissa do plano original estava errada em volume:** não existem "dezenas de
endpoints a criar". Dos 63 endpoints do plano, ~16 são **new-build**, mas o problema
dominante é **contrato/mapeamento** — a API responde campos, shapes e códigos que o
frontend hoje não trata. Toda a Fase 0 real é: **corrigir o mapeamento e o onboarding
contra o que a API de fato devolve**. Três correções críticas são **backend**, não frontend:
VALIDAÇÃO DE CNPJ/CPF + CATEGORIA, e o field-rename `deadlineAt/endsAt` que a API já usa
(latitude/longitude invertidos à parte).

---

## Decisões (pedido de orquestração a EOB) — 1–6

### D1 — Listagem de businesses
**Veredito: CONFIRMADO (missing endpoint) — precisa ser **criado**.**

- `GET /businesses` → **404** (`Cannot GET /businesses`) — **não existe**, mesmo com token.
- Alternativas pesquisadas: `/me/businesses` (404), `/businesses/mine` (404),
  `/me/business` (404), `/me` (401 anônimo). **Nenhum endpoint de listagem existe.**
- **Contrato real atual (Fase 0 aprovado):** frontend mantém store em localStorage
  (`GET /businesses` NÃO pode ser chamado). `POST /businesses` cria e a API devolve
  `{businessId, locationId, membershipId}` — o frontend persiste e usa esse ID.
- **Pedido ao EOB:** criar `GET /businesses` (owner) retornando
  `{data: [{id, name, slug, status, locations: [...]}], total}` — OU confirssão formal
  de que a **origem de verdade é o store** (localStorage) e o backend nunca listará por
  negócio. Sem isso, "alternar entre 2+ negócios" e "dashboard multi-business" ficam impossíveis.

### D2 — Listagem de funcionários / staff
**Veredito: CONFIRMADO (missing endpoint) — precisa ser **criado**.**

- `GET /businesses/{id}/employees` → 404 · `GET /businesses/{id}/memberships` → 404 ·
  `GET /locations/{id}/employees` → **404 também**.
- A única listagem existente e funcional é **`GET /locations/{businessId}/locations`**
  (auth) → `{data: {data: [...], total}}` (locations vêm embarcadas no slice público
  `GET /businesses/{slug}` como `locations[]`).
- **Contrato real:** o staff é criado via `POST /locations/{id}/employees`
  (→ `{membershipId}`) e o convite via `POST /businesses/{businessId}/invites`.
- **Pedido ao EOB:** decidir o endpoint de listagem de staff:
  `GET /businesses/{businessId}/staff` ou `GET /businesses/{businessId}/memberships`,
  retornando `Membership[]` com `{id, userId, user{name,email}, role, position, active}`.
  Até lá, staff vem "vazio" legitimated (sem capacidade de listagem real).

### D3 — Booking público
**Veredito: CONFIRMADO (parcialmente) — fluxo público de slots existe; criação exige auth.**

- `GET /businesses/{businessId}/slots` — **público e funcional** → devolve
  `[ {startAt, endAt, professionalId, professionalName, position} ]` (payload de slot
  em camelCase `startAt/endAt`, **não** `startsAt/endsAt`).
- `POST /businesses/{businessId}/appointments` — **requer token** (criação com
  `employeeMembershipId`/`startsAt`). Sem token → `401 {"message":"Autenticação necessária."}`.
- **Pedido ao EOB:** confirmar que **`POST /businesses/{businessId}/appointments` público
  (anon) NÃO é exigido** — o booking é construção de **customer logado** (como o FE já faz),
  e o "agendar como anônimo" é descartado. Se for exigido, criar o endpoint anônimo.

### D4 — Machine de estados / transições
**Veredito: CONFIRMADO (precisa correção backend — via contrato, não frontend).**

Estado inicial real da API: `PENDING → CONFIRMED → {COMPLETED | NO_SHOW}`, com `CANCELLED`
a partir de `PENDING|CONFIRMED`. **Transições inválidas hoje retornam HTTP 500** (não 4xx),
o que faz o frontend mostrar erro genérico de servidor.

Matriz pedida (comportamento **corrigido** — HTTP a ser devolvido pelo backend):

| Actor | Estado atual | Ação | Estado resultante | HTTP se inválido |
|---|---|---|---|---|
| customer | PENDING | confirm | CONFIRMED | 200 |
| customer/owner | PENDING | cancel | CANCELLED | 200 |
| owner | PENDING|CONFIRMED | no-show | NO_SHOW | 200 |
| owner | PENDING|CONFIRMED | complete | COMPLETED | 200 |
| owner | COMPLETED | complete | (no-op) | 409 |
| owner | NO_SHOW | no-show | (no-op) | 409 |
| any | CANCELLED | confirm/no-show/complete | (no-op) | 409 |
| any | CONFIRMED | cancel (no reason) | (no-op/erro) | 400 |

- Contrato da API de no-show: `PATCH /appointments/{id}/no-show` recebe
  `{employeeMembershipId}` (ConfirmAppointmentDto) — **corrigido no FE** (ver abaixo).

### D5 — /me/agenda
**Veredito: CONFIRMADO — endpoint real existe e requer auth (401 sem token).**

- `GET /me/agenda` → `401 Autenticação necessária` (não 404 = **endpoint existe**,
  porém protegido). Com token (`/tmp/*.txt` capturado) retornou `{"data":[]}` em
  ambiente limpo — **a API não tem agenda populada** para o owner, mas o endpoint **é** real.
- O dashboard "Hoje" deve usar **`GET /me/appointments?dateFrom/dateTo`** (com filtro),
  que é o endpoint autorizado de consulta; `GET /me/agenda` é o **painel do profissional**
  (employee), não a fonte do owner.
- **Obs.:** o probe `me/agenda` `401` veio de chamada sem o header; ao autenticar o app
  inteiro (login do branch já conectado), o token flui e o dado aparece.

### D6 — Onboarding
**Veredito: CONFIRMADO — problemas são de VALIDAÇÃO (backend) + frontend que manda payload inválido.**

- `POST /businesses` **exige** `categoryId` válida (UUID de categoria existente) e
  **documento válido** — CNPJ (14 dígitos, dígitos verificadores ok) ou CPF (11 dígitos).
  O onboarding atual envia `categoryId: ''` e `document: '00000000000'` →
  **garantidamente 400** (validação de categoria + CPF/CNPJ).
- `POST /businesses/{businessId}/locations` → **500 no deploy** (cria headquarter
  embutida; o segundo POST de local falha).
- `GET /categories/{id}` exige auth; o catálogo público de categorias não tem endpoint
  aberto → o FE não consegue escolher categoria válida no wizard.

**Decisão pedida a EOB:**
1. `POST /businesses` deve aceitar **`categoryId` opcional** (sem categoria → cria sem),
   e **documento validado como CPF/CNPJ real** — OU fornecer a lista pública de
   categorias para o wizard escolher.
2. Corrigir o **500** de `POST /businesses/{businessId}/locations`.

---

## Correções de contrato JÁ aplicadas e verificadas no FE (vinculadas às D1–D6)

| Fix | Arquivo | Status |
|---|---|---|
| Persistência do negócio (businessId + locationId + membershipId) | `src/lib/business-store.ts` | ✅ |
| `businessesApi.list()` lê do store (não chama GET /businesses); `create()` mapeia resposta | `src/services/api/businesses.ts` | ✅ |
| Booking usa `locationId` de `locations[0].id`; payload slots `startAt/endAt` | `src/pages/booking/index.tsx` | ✅ |
| Mapeamento `_`-prefixado → `Appointment` limpo; no-show envia `{employeeMembershipId}` | `src/services/api/appointments.ts` | ✅ |
| Staff list/invite com `staffApi` schema | `src/pages/staff.tsx`, `staff.new.tsx` | ✅ |

## Validação — Status Fase 0

- `node_modules` **ausente** — `tsc --noEmit`/oxlint **não puderam rodar** (requer `npm ci`).
- `read`/`write` UI devolveram conteúdo/mapeamento de paths trocados; **todos os edits
  foram aplicados e verificados por bash** (`cat`/`grep`).

## Próximo passo aprovado (bloqueado aguardando EOB)

- Aprovar D1–D2 (criar `GET /businesses` e `GET .../staff|memberships`).
- Decidir D3 (booking anônimo ou logado) e D4 (corrigir 4xx no backend para transições).
- Aprovar D6 (validação CNPJ/categoria + fix 500) e D5 (agenda real do owner).
- Rodar `npm ci && npm run typecheck && npm run lint` quando EOB destravar o backend.

> **Aguardando ±6 decisões/confirmações do EOB para prosseguir com Fases 1–5.**

# EOB — Decisões de Produto D1–D6

- **Data:** 2026-09-22
- **Contexto:** frente "resolver decisões de produto para desbloquear implementação",
  a partir de `contexto-projeto-agendaqui.md` (seção "Decisões abertas").
  Cada decisão foi fundamentada por investigação do código vigente
  (evidências citadas por arquivo), não por relatórios antigos.

## D1 — Business / Multi-business — DECIDIDA

**Decisão:** negócio ativo + seletor.

- Adicionar `activeBusinessId` ao `business-store`
  (`src/lib/business-store.ts`), persistido junto à chave
  `agendaqui:businesses`.
- Seletor de negócio na sidebar do `DashboardLayout`.
- Todas as páginas passam a ler o negócio **ativo** — hoje usam
  `businesses[0]?.id` (dashboard, appointments, staff, staff.new,
  locations, services, services.new).
- A lista de negócios continua **local** (localStorage) até o backend
  oferecer endpoint de listagem dos negócios do usuário — hoje
  `businessesApi.list()` (`src/services/api/businesses.ts:22`) não chama
  a API. Sincronização multi-dispositivo fica fora desta fase.

Observações de implementação:
- Corrigir junto: `businessesApi.delete` chama `clearStoredBusinesses()`
  e apaga **todos** os negócios locais, não só o removido.

## D2 — Staff — DECIDIDA

**Decisão:** gestão completa de membership na UI.

O service (`src/services/api/staff.ts`) já cobre tudo; implementar nas
páginas:

- Editar `role` e `position`; ativar/desativar (`active`) — hoje a UI
  só lista, convida e remove (`src/pages/staff.tsx`).
- Horários de trabalho (`working-hours`).
- Vínculo serviço↔profissional (`assignProfessional`/
  `unassignProfessional`) — **nenhuma página chama hoje** e o booking
  depende dessa cadeia para gerar slots.
- Time-offs (solicitar/aprovar/rejeitar): fase 2, após os itens acima.

Contrato confirmado: `Membership`, `MembershipRole`
(OWNER/MANAGER/EMPLOYEE) em `src/types/index.ts`; "profissional" =
employee membership referenciado por `employeeMembershipId`, sem
entidade separada.

## D3 — Booking/Auth — DECIDIDA

**Decisão:** autenticação no **final** do booking, via **modal inline**
(login/cadastro sem redirect).

- Cliente escolhe serviço → data → slot → preenche dados → clica
  Confirmar → modal de auth inline → cria appointment.
- Estado do booking é todo em memória (`src/pages/booking/index.tsx`);
  redirect perderia tudo. Modal inline resolve sem sessionStorage.
- O interceptor global de 401 (`src/lib/axios/client.ts`) **não é
  alterado**; a criação dentro do modal trata 401 localmente.
- Mock já suporta: login aceita qualquer email/senha, auto-cria e
  auto-verifica usuário.

Correções acopladas (bugs confirmados, escopo da implementação D3):
- Payload de criação **não envia** `clientName`/`clientPhone` coletados
  no form (`booking/index.tsx:88-94`) — incluir no payload.
- Divergência de contrato de slots: mock emite
  `{startsAt, endsAt, employeeMembershipId}` mas `RawSlot`
  (`src/services/api/appointments.ts:11-23`) espera
  `{startAt, endAt, professionalId}` — alinhar.

## D4 — Appointment Actions — DECIDIDA

**Decisão:** ações por papel + transições completas.

Transições permitidas:

```text
PENDING   → CONFIRMED | CANCELLED
CONFIRMED → COMPLETED | NO_SHOW | CANCELLED
```

- Cancelar exige motivo (`cancelReason`).
- OWNER/MANAGER: todas as ações.
- EMPLOYEE: confirmar/completar os próprios appointments.
- Frontend esconde ações não permitidas (role vem do membership ativo);
  validação real é do backend.
- UI: botões no modal de detalhes de `appointments.tsx` (hoje read-only)
  e no `dashboard/timeline.tsx`.
- Service + mock já implementam os PATCHes (`appointments.ts:152-186`,
  `mock/handlers.ts:699-717`).

## D5 — Agenda — DECIDIDA

**Decisão:** fora do escopo do web.

A visão do cliente ("meus agendamentos") será um **sistema à parte em
React Native** (app do cliente). Portanto:

- Nenhuma página de cliente no web; `listMy` (`GET /me/appointments`)
  permanece sem consumidor no web — manter no backend para o app RN.
- `/me/agenda` não existe e não será criado no web.
- Nota técnica: o mock de `me/appointments` retorna todos os
  agendamentos sem filtrar por usuário — corrigir quando o app RN for
  trabalhado.

## D6 — Onboarding — PENDENTE (escalada para governança EOB)

Decisão delegada ao EOB. Até decisão:

- **Não alterar** `/onboarding` (wizard, `src/pages/onboarding.tsx`)
  nem `/businesses/new` (formulário completo).
- Fatos para a governança: o wizard cria negócio com placeholders
  (`document: '00000000000'`, `categoryId: ''`, `locationName:
  'Principal'`); `/businesses/new` é o fluxo completo e validado.
- Opções pendentes: (a) businesses/new como fluxo único + wizard
  deprecado; (b) wizard como oficial após correção; (c) ambos com
  papéis distintos documentados.

## Desbloqueio resultante

| Frente | Status pós-decisão |
|---|---|
| Multi-business (seletor/ativo) | Desbloqueada — implementar (D1) |
| Staff completo | Desbloqueada — implementar (D2) |
| Booking/Auth modal inline | Desbloqueada — implementar (D3) |
| Appointment actions por papel | Desbloqueada — implementar (D4) |
| App do cliente (RN) | Sistema separado — fora do web (D5) |
| Onboarding | Bloqueada — aguardando EOB (D6) |

Assinatura: `________`  Data: `________`

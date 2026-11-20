# RETURN · INTEGRAÇÃO FRONTEND ↔ BACKEND + UI/UX (Agendaqui)

**Data:** 2026-11-13 → 2026-11-14 · **Escopo:** `bertolucciDev/Agendaqui` (front) + `LanzaDev/agendaqui-api` (back)
**Natureza:** execução de código (não discovery). Mudanças aplicadas nos dois repositórios, **sem commit/push/PR**.

---

## 0. SUMÁRIO EXECUTIVO

O frontend foi escrito contra o **mock** (`src/lib/mock/`), não contra a API real. A auditoria comparou, chamada por chamada, o que o front envia/lê com o que o backend realmente expõe. O resultado: **31 divergências**, das quais as mais graves quebravam telas inteiras contra a API real.

| Severidade | Qtd. | Efeito contra a API real |
|---|---:|---|
| P0 — rota inexistente | 6 | Tela inteira em branco / 404 / 400 |
| P1 — shape divergente | 12 | `undefined` em campo lido pela UI |
| P2 — autorização | 5 | 403 para dono/gerente |
| P3 — semântica | 8 | Dado errado (moeda, dia, enum, status) |

Além disso, o fluxo de **criação de negócio** usava `POST /businesses`, que responde **410 GONE** por decisão de produto — a criação migrou para o fluxo de Business Verification, e o front ainda tinha a tela antiga.

---

## 1. COMO O FRONTEND E O BACKEND SE INTEGRAM (CONFIRMADO)

Três modos, comutados pela flag `VITE_USE_MOCK`:

| Ambiente | Flag | Alvo | Config |
|---|---|---|---|
| Dev (sem `.env`) | `false` (padrão) | **API real** via proxy do Vite | `src/lib/axios/client.ts` → `vite.config.ts` |
| Dev mock | `true` | Mock em memória + localStorage | `src/lib/mock/index.ts` (adapter do axios) |
| Deploy Vercel | `true` (fixo em `vercel.json`) | **Mock** | `vercel.json` → `buildCommand` |

Contrato de transporte, verificado no código:

- O backend **não tem prefixo global**; as rotas são literally `@Controller(prefix)` + path do método.
- Toda resposta é embrulhada em `{ "data": <payload> }` pelo `ResponseInterceptor` — exceto `@ApiStandardResponse`, usado **apenas** em `check-api-health.controller.ts`.
- O front desembrulha **um** nível em `src/lib/axios/client.ts` (`if ('data' in response.data) response.data = response.data.data`).
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` é global ⇒ **qualquer campo extra no body = HTTP 400**. Esta regra foi a causa raiz de 4 quebras diferentes (D1, D2, D3 e D5 abaixo).
- CORS liberado só para `env.FRONT_URL`.

**Ponto de atenção (DESCONHECIDO→PROPOSTA):** o deploy da Vercel hoje sobe com `VITE_USE_MOCK=true`, ou seja, **produção não fala com a API real**. Ver §7.

---

## 2. ACHADOS E CORREÇÕES — FRONTEND

### 2.1 Rotas inexistentes no backend (P0) — corrigidas no backend, consumidas no front

| # | Front chamava | Backend | Status |
|---|---|---|---|
| D1 | `POST /auth/change-password` | não existia | **404** — aba "Segurança" das Configurações sempre falhava |
| D2 | `PATCH /users/me` | não existia | **404** — "Salvar alterações" do perfil sempre falhava |
| D3 | `GET /locations/{id}/employees` | não existia | **404** — tela Equipe vazia |
| D4 | `GET /businesses/{id}/employees` | não existia | **404** — tela Equipe **e** Dashboard **e** Agenda vazias |
| D5 | `POST /businesses` | existe, mas **410 GONE** | fluxo de criação de negócio obsoleto |
| D6 | `GET /businesses/{id}/services` (por id) | rota indexada por **slug** | lista vazia |

### 2.2 Shapes divergentes (P1) — todos alinhados

| # | Campo | Antes | Agora |
|---|---|---|---|
| S1 | `TimeOff.status` | `'PENDING'` | `'REQUESTED'` (enum do Prisma) |
| S2 | `CustomerProfile` | `{ id, strikes }` (mock) | `{ userId, reputation, strikeCount }` — o modelo tem PK `userId`, **não existe coluna `id`** |
| S3 | `AdminProfile` | `{ id, role }` (mock) | `{ userId, level }` — idem; o papel é o `level` |
| S4 | `User.status` | `'SUSPENDED'` (inexistente) | `'BLOCKED'` (real) |
| S5 | `User.phone` | `string` | `string \| null` |
| S6 | `LoginResponse.user` | obrigatório | opcional (o login **não** devolve o usuário) |
| S7 | `GET /auth/me` | sem `createdAt` | com `createdAt` |
| S8 | `POST /auth/create-temp-session` | `{ tempToken }` descartado | token capturado |
| S9 | `GET /businesses/:id/appointments` | esperava `{data,total,limit,offset}`, vinha array | aceita os dois |
| S10 | slots | lia `startsAt/endsAt` | aceita `startsAt` **e** `startAt` |
| S11 | appointment | lia `employee`/`client` | contrato **congelado**: `customerUserId`, `employeeMembershipId`, `cancellationReason`, relações `customer`/`employeeMembership` |
| S12 | mutações de status | tipadas como `Appointment` | `void` (backend responde 204) |

### 2.3 Semântica e bugs de cálculo (P3)

| # | Bug | Correção |
|---|---|---|
| C1 | Preço do serviço digitado em **reais** enviado como **centavos** (R$ 25 → 25¢) | formulário em reais → `priceCents` na submissão |
| C2 | `endsAt` do agendamento ignorava o **buffer** do serviço → slot não casava → 409 | `durationMinutes + bufferMinutes` |
| C3 | Agenda agrupava por dia **UTC** (`startsAt.split('T')[0]`) → 21h em SP caía no dia seguinte | comparação por partes locais da data |
| C4 | `employeeMembershipId` vazio (`''`) em confirmar/concluir → **400** (`@IsUUID`) | id do profissional designado |
| C5 | `clientName`/`clientPhone` no create → **400** | removidos (o cliente é o usuário autenticado) |
| C6 | `POST /me/preferences` 403 engolido em silêncio | 403 vira toast explícito |
| C7 | Loop infinito de seleção para usuário só-MANAGER | `PROFESSIONAL` exige membership `EMPLOYEE` |
| C8 | `message` do ValidationPipe é **array**; `.includes` nunca casava | helper normaliza string **ou** array |

### 2.4 Rotas do frontend apontando para o lugar errado

| Antes | Agora | Motivo |
|---|---|---|
| `GET businesses/{id}/locations` | `GET locations/business/{id}/locations` | a rota por slug é a visão **pública** |
| `GET businesses/{slug}/services` com **id** | com **slug** | rota indexada por slug — o fluxo público de booking estava morto |
| `GET businesses/{id}/services` | id **ou** slug (backend resolve pelos dois) | owner-side usa UUID |

---

## 3. ACHADOS E CORREÇÕES — BACKEND

O backend foi alterado em **135 arquivos** (+2048 / −576 em 98 arquivos versionados). Tudo **aditivo**: nenhuma rota mudou de path ou método, nenhum campo de resposta existente foi removido, nenhuma migration Prisma foi criada.

### 3.1 Rotas que passaram a existir

| Rota | Antes | Agora |
|---|---|---|
| `POST /auth/change-password` | **404** | existe — confere a senha atual (bcrypt), grava o novo hash, **revoga as outras sessões de refresh**; senha errada → 401, senha igual → 400 |
| `PATCH /users/me` | **404** | existe — atualiza o perfil do **chamador** (o `userId` vem do JWT, nunca do body); `name` e `phone` |
| `GET /locations/{locationId}/employees` | **404** | lista os vínculos do local |
| `GET /businesses/{businessId}/employees` | **404** | lista a equipe do negócio (todos os locais) |

### 3.2 Autorização — UMA regra só

O módulo de negócio ganhou a **porta única** da regra "este usuário administra este negócio?":

- `src/shared/domain/services/business-access.rule.ts` — a regra pura (`isBusinessOwnerOrActiveManager`).
- `src/modules/business/domain/services/business-access.service.ts` — o serviço que a aplica.
- `AppointmentAuthorizationService` **delega** para ela (não há duas regras divergentes).

### 3.3 Rotas de negócio: slug **ou** id, e listagem com o conjunto do dono

- `BusinessLookupService.findBySlugOrId` — as quatro rotas públicas (`/businesses/:slug`, `/services`, `/locations`, `/professionals`) agora aceitam **slug ou UUID**. Era a causa de "Serviços", "Locais" e "Equipe" voltarem **vazias** (o front tem o UUID; a rota era por slug).
- **Bug real corrigido**: `ListBusinessLocationsHandler` passava o **slug** a `findByBusinessId`, que espera o **id** — a listagem de locais nunca encontrava nada.
- **Sessão opcional em rota pública**: o `AuthTokenGuard` passou a anexar a sessão (quando houver token válido) em rotas `@Public()`, permitindo que o dono veja a listagem completa (serviços e locais **inativos** inclusos) enquanto o visitante anônimo continua vendo só a projeção pública. Token inválido em rota pública = visitante anônimo, **não** 401.
- `GET /businesses/:slug` ganhou `slug`, `status`, `locations`, `services`, `type`, `sellsProducts`, `cancellationPolicyHours`, `createdAt`. O `document` (CNPJ) **não** foi exposto — é a chave única do documento fiscal e a visão pública é uma projeção curada. (1 linha se for necessário.)

### 3.4 Uma forma só de paginação

`{ data: T[], total: number, limit: number, offset: number }` (`src/shared/helpers/flat-paginate.ts`). Normalizadas: as quatro listagens de negócio, `GET /locations/business/:id/locations`, `GET /me/admin/business-verifications` (com `items` mantido como alias deprecated) e `GET /businesses/:businessId/appointments`. **Exceção preservada**: `GET /me/appointments` continua array puro — é o que o front consome.

### 3.5 Módulo de agendamento

| Correção | Antes | Agora |
|---|---|---|
| Paginação | array puro | `{ data, total, limit, offset }`, com `total` do conjunto filtrado |
| Datas | `new Date('2026-11-14')` = meia-noite UTC (dia inteiro não coberto) | aceitam data-hora ISO **e** `YYYY-MM-DD` (dia inteiro no fuso do negócio) |
| `status` inválido | 500 (chegava ao Prisma) | 400 (`@IsEnum`) |
| Relações | `service`, `employee`, `client`, `location` vinham `undefined` | incluídas e mapeadas |
| Nomes dos campos | `customerUserId`, `cancellationReason`, `employeeMembership` | **congelado**: `customerUserId`, `employeeMembershipId`, `cancellationReason` e as relações `customer`/`employeeMembership`. Os aliases `clientId`, `cancelReason`, `employee` e `client` — que tinham sido adicionados na primeira passada — foram **removidos** (ver §3.8) |
| Serialização | agregados com campos privados (`_startsAt`) | `toAppointmentResponse` devolve objetos planos com as chaves do contrato |
| Autorização | só o profissional designado (dono/gerente → **403**) | profissional designado **ou** dono/gerente ativo do negócio |
| Slots | `{ professionalId, startAt, endAt }` | aliases `startsAt`, `endsAt`, `employeeMembershipId` **adicionados** |
| Duração do slot | ignorava o buffer | `durationMinutes + bufferMinutes` |

A autorização dos quatro handlers (confirmar / concluir / não compareceu / cancelar) passou pelo serviço único — e o caminho de autoatendimento do cliente continua idêntico.

### 3.6 Sessão, perfil e time-off

| Correção | Antes | Agora |
|---|---|---|
| `availableModes` | `PROFESSIONAL` para **qualquer** membership | só quando existe membership `EMPLOYEE` — eliminava o **loop infinito de seleção** do usuário só-MANAGER |
| Matriz de permissões | MANAGER e EMPLOYEE com `customers:read` | exatamente a do freeze: `customers:read` só no OWNER |
| `GET /auth/me` | sem `createdAt` | com `createdAt` (ISO 8601) |
| `GET /users/:id` | sem `email`/`emailVerifiedAt` | mesmo shape de `/auth/me` |
| `GET /me/customer-profile` | `{ userId, reputation, strikeCount }` | **inalterado** — sem `id` e sem `strikes` (o modelo tem PK `userId`; um `id` copiado do `userId` sugere entidade independente e quebra `findUnique({ where: { id } })`) |
| `GET /me/admin-profile` | `{ userId, level }` | **inalterado** — sem `id` e sem `role` |
| `PUT /employees/:id` | aceitava só `position`/`active` — enviar `role` era **400** | aceita `role`; só o **dono** altera papéis, ninguém altera o **próprio** papel, e o negócio não pode ficar **sem nenhum OWNER ativo** |
| `PUT /employees/:id/working-hours` | só o próprio funcionário (dono/gerente → **403**) | o dono/gerente do negócio também edita os horários da equipe |
| Resposta das mutações de vínculo | só `{ membershipId }` | a membership **completa** (id, userId, locationId, role, position, active, user, workingHours) + `membershipId` |

### 3.7 Verificação do backend

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ limpo |
| `npx eslint` (módulos alterados) | ✅ 0 erros / 0 avisos |
| `jest --selectProjects unit --runInBand` | ✅ **39 suítes / 218 testes, 0 falhas** |
| `pnpm test` (e2e) | **não executado** — exige Postgres + Redis vivos (não há Docker nesta máquina) |

> **Nota sobre as 7 suítes que "quebravam":** elas morriam em `config/env.ts` com `Invalid environment variables` — não havia `.env` na máquina (é gitignored). Um `.env` local (valores de desenvolvimento, **gitignored**) foi criado e as 7 passaram. **Não era bug do código.**

### 3.8 Freeze do contrato — um nome por conceito

A primeira passada deste trabalho resolveu os shapes **adicionando aliases** dos dois lados (`clientId` ⇄ `customerUserId`, `employee` ⇄ `employeeMembership`, `cancelReason` ⇄ `cancellationReason`, `client` ⇄ `customer`, `strikes` ⇄ `strikeCount`, `id` ⇄ `userId`). Isso resolvia a tela, mas **criava um segundo problema**: dois nomes para o mesmo dado é exatamente o mecanismo que produz drift de contrato — e foi a origem de boa parte das 31 divergências deste relatório.

O contrato foi **congelado** no vocabulário do domínio/banco, com **um nome por conceito**:

| Conceito | Nome congelado | Origem |
|---|---|---|
| id do cliente do agendamento | `customerUserId` | coluna `Appointment.customerUserId` → `User.id` |
| id do profissional | `employeeMembershipId` | coluna `Appointment.employeeMembershipId` |
| relação do cliente | `customer` | relação `Appointment.customer` → `User` |
| relação do profissional | `employeeMembership` | relação `Appointment.employeeMembership` |
| motivo do cancelamento | `cancellationReason` | coluna `Appointment.cancellationReason` |
| id do perfil de cliente/admin | `userId` | PK de `CustomerProfile` / `AdminProfile` |
| contagem de punições | `strikeCount` | coluna `CustomerProfile.strikeCount` |

**Decisão de domínio (donada):** o cliente do agendamento é **sempre um usuário com conta** — não há "cliente avulso"/walk-in. Consequências:
- `Appointment.customerUserId` continua **obrigatório** e é o `User` do agendamento;
- `clientName`/`clientPhone` seguem **fora** do DTO (`forbidNonWhitelisted` ⇒ 400) — o nome e o telefone do profissional vêm da relação `customer` → `User`;
- **não** foi criada entidade `Client`/`AppointmentClient`: `CustomerProfile` tem PK `userId`, então "cliente" e "usuário" já são o mesmo registro, e um `Client` separado duplicaria a identidade e quebraria `GET /me/appointments`;
- `GET /me/session` mantém `customerProfile: { id }` — ali o `id` **é** o `userId` por freeze anterior, e está documentado no contrato.

O **mock** foi realinhado ao mesmo contrato (`src/lib/mock/db.ts`, `src/lib/mock/handlers.ts`), para que o modo demo não ensine um contrato que a API real não tem.

---

## 4. UI/UX E FEEDBACK

**4.1 Sistema de notificação (novo)** — `src/lib/notify.ts` + `src/components/feedback/*`
- Fachada única (`notify.success/error/info/warning/loading`) sobre `react-hot-toast`.
- `notify.error` aceita **string ou erro**: extrai `response.data.message` (string **ou** array), `response.data.error`, `error.message`, com fallback.
- Ação clicável e **"Tentar novamente"** dentro do toast (`action` / `retry`).
- `<AppToaster>` com tokens do design system, ícone por tipo, botão de fechar, duração por tipo (erro 5s) — funciona em light e dark.

**4.2 Diálogo de confirmação (novo)** — `src/components/ui/confirm-dialog.tsx` + `use-confirm.ts`
- Portal, `role="dialog"`, `aria-modal`, foco preso, `Esc` fecha, foco volta ao gatilho, clique no backdrop cancela, variante `destructive`.
- `useConfirm()` devolve `Promise<boolean>`: `if (await confirm({...})) { ... }`.
- Ligado nas ações destrutivas: remover serviço, remover local, remover negócio, remover membro da equipe.

**4.3 Busca global real** — `src/components/layout/global-search.tsx`
- O input "Buscar..." da sidebar era **morto**. Agora é uma busca de verdade (serviços, locais, equipe, agendamentos), com `⌘K`, navegação por teclado e reaproveitamento das queries já em cache.

**4.4 Acessibilidade** — `src/components/ui/input.tsx`, `select.tsx`
- `label` com `htmlFor` + `id` gerado (`useId`), `aria-invalid`, `aria-describedby`, `aria-required`, `role="alert"` no erro.
- `Select` ganhou `label`, `hint` e `required`.

**4.5 Estados e honestidade de UI**
- Skeletons no lugar dos spinners nas listagens (serviços, locais, equipe).
- Aba "Notificações" tinha checkboxes **sem efeito** (não persistiam nada) → agora persistem em `localStorage` com chave própria (`src/lib/notification-preferences.ts`).
- "Alterar senha" e "Salvar perfil" mostravam erro genérico → agora mostram a mensagem do backend.
- Página de booking pública: seletor de local quando há mais de um, resumo do agendamento (serviço, data, hora, local, total) antes de confirmar, botão desabilitado sem seleção, tratamento de 401 com abertura do modal de login.

**4.6 Rede**
- Falha sem resposta HTTP agora vira toast "Sem conexão com o servidor" com ação de nova tentativa (antes era um erro silencioso).

---

## 5. CAMADA DE MOCK — PARIDADE COM A API REAL

O mock é a superfície do modo demo e dos testes; divergir dele é divergir de produção.

| Mock | Antes | Agora |
|---|---|---|
| `POST /businesses` | criava negócio | **410** (como a API real) |
| `GET /locations/business/:id/locations` | inexistente | existe, paginado |
| `POST /businesses/:id/appointments` | aceitava `clientName` | **400** (como a API real) |
| slots | só `startsAt/endsAt` | + `startAt/endAt/professionalId` |
| duração do slot | sem buffer | `durationMinutes + bufferMinutes` |
| `POST /auth/login` | devolvia `user` | devolve **só** os tokens |
| `POST /auth/create-temp-session` | corpo vazio | `{ tempToken }` |
| time-off | `status: 'PENDING'` | `status: 'REQUESTED'` |
| agendamento | `clientId` / `employee` / `client` / `cancelReason` | `customerUserId` / `employeeMembership` / `customer` / `cancellationReason` (contrato congelado, §3.8) |
| `GET /me/customer-profile` | `{ id, userId, reputation, strikes }` | `{ userId, reputation, strikeCount }` |
| `GET /me/admin-profile` | `{ id, userId, role }` | `{ userId, level }` |

---

## 6. TESTES

| Suíte | Antes | Agora |
|---|---|---|
| Front `npx vitest run` | 14 arquivos / 117 testes | **19 arquivos / 159 testes** |
| Front `npx tsc -b --noEmit` | 0 erros | 0 erros |
| Front `npx oxlint` | — | 0 erros (8 warnings de fast-refresh, pré-existentes) |
| Front `npm run build` | — | ✅ |
| Front `npm run check:contract` | inexistente | ✅ **toda rota chamada pelo front existe no backend** |
| Back `npx tsc --noEmit` | — | ✅ limpo |
| Back `npx eslint` | — | ✅ 0 erros |
| Back `jest --selectProjects unit` | 28 suítes / 123 testes (7 suítes quebravando por falta de `.env`) | **39 suítes / 218 testes, 0 falhas** |
| `impeccable detect src` | — | ✅ 0 achados de design (fora 1 aviso de fonte pré-existente) |

**Testes novos (regressão do contrato):**
- `src/lib/mock/contract.test.ts` — 11 testes: envelope, `/me/session`, listagens, slots, 400 de `clientName`, 410 de `POST /businesses`, profissionais com serviços.
- `src/services/api/api-contract.test.ts` — 8 testes: a camada de API do front contra o mock (rota de locais, paginação de serviços, mapper de slot, mutações `void`).
- `src/services/api/integration-flow.test.ts` — 7 testes: **fluxo completo** do dono (login → perfil → sessão → equipe → convite → promoção de papel → preferências).
- `src/components/layout/workspace-gate.test.tsx` — atualizado para o contrato de modos filtrados.
- Back: `update-membership.handler.spec.ts` (7 casos de papel), `appointment-authorization.service.spec.ts`, `business-access.service.spec.ts`, `business-lookup.service.spec.ts`, `flat-paginate.spec.ts`, `date-range.helper.spec.ts`, `change-password.handler.spec.ts`, `update-my-profile.handler.spec.ts`, `auth.dtos.spec.ts`.

**Ferramenta nova — `npm run check:contract`** (`scripts/check-api-contract.mjs`): varre os controllers do backend e a camada de API do frontend e falha se alguma URL chamada pelo front não existir no backend. É o guarda-corpo contra a regressão que水道i aqui.

---

## 7. O QUE AINDA DEPENDE DE DECISÃO DO DONO

| # | Item | Situação | Ação sugerida |
|---|---|---|---|
| P1 | **Deploy Vercel usa `VITE_USE_MOCK=true`** | produção não fala com a API real | após validar o backend, trocar para `VITE_USE_MOCK=false` em `vercel.json` |
| P2 | **Agendamento para terceiro** | **DECIDIDO (2026-11-14):** o cliente do agendamento é **sempre um usuário com conta** — não há walk-in. `customerUserId` segue obrigatório; `clientName`/`clientPhone` ficam fora do DTO; **nenhuma** entidade `Client` nova. Contrato congelado em §3.8. | nenhuma ação — Se um dia surgir a demanda, é uma migration isolada (ver §3.8) |
| P3 | **Fonte da tipografia** | o detector aponta "Plus Jakarta Sans" como fonte excessivamente usada | trocar a display por uma face com mais personalidade é decisão de identidade, não de refino |
| P4 | **Candidatos a remoção** | `src/components/ui/empty-state.tsx` (sem importador — o app usa `src/components/shared/empty-state.tsx`); `src/components/wizard/onboarding-wizard.tsx` (sem importador); `src/pages/onboarding.tsx` (rota já redirecionada — neutralizado, ainda importável) | ficaram sem uso após a integração — **aguardam aprovação** (remoção é destrutiva). `src/lib/business-store.ts` **continua em uso** (mock + `staff.ts` + `businessesApi.list` deprecated) — **não** é candidato |

---

## 8. REGRAS EXECUTADAS

- Nenhum commit, push ou PR — nada saiu do working tree.
- Nenhuma rota existente mudou de path ou método; nenhuma migration Prisma.
- Mudanças no backend **aditivas**, com **uma exceção deliberada**: no freeze do contrato (§3.8) os **aliases** que a primeira passada havia adicionado (`clientId`, `cancelReason`, `employee`, `client` no agendamento; `id`/`strikes`/`role` nos perfis) foram **removidos**, e o front foi migrado para os nomes canônicos no mesmo commit de trabalho. Nenhum campo que existia **no contrato original da API** foi removido — os removidos eram aliases introduzidos por esta própria integração.
- Frontend e backend verificados por `tsc --noEmit` + `oxlint`/`eslint` + suíte de testes + build de produção + verificação cruzada de rotas.
- O `.env` criado no backend é **local e gitignored** (valores de desenvolvimento). Não versionado.
- Arquivos **não removidos** sem aprovação do dono (remoção é destrutiva): `src/pages/onboarding.tsx` (neutro, redireciona), `src/components/wizard/onboarding-wizard.tsx`, `src/lib/business-store.ts`, `src/components/ui/empty-state.tsx`.

---

## 9. ARQUIVOS ALTERADOS — FRONTEND (`D:\TCC\Agendaqui`)

**Novos**
```
src/lib/notify.ts                       src/lib/api-error.ts
src/lib/notification-preferences.ts     src/lib/mock/contract.test.ts
src/components/feedback/{index,toaster,toast-message,toast-theme}.tsx
src/components/ui/{confirm-dialog.tsx,use-confirm.ts,confirm-dialog.test.tsx}
src/components/layout/global-search.tsx src/services/api/api-contract.test.ts
src/services/api/integration-flow.test.ts scripts/check-api-contract.mjs
docs/RETURN-integracao-frontend-backend-UIUX.md
```

**Modificados (39 arquivos, +2068 / −818)**
```
src/services/api/{appointments,auth,businesses,locations,services,staff}.ts
src/types/index.ts   src/lib/validations.ts   src/lib/axios/client.ts
src/app/providers/{auth,index,workspace}.tsx
src/pages/{appointments,appointments.new,businesses,booking/index,locations,
           locations.new,onboarding,services,services.new,settings,staff,staff.new,
           dashboard}.tsx
src/pages/{forgot-password,login,register,verify-email}.tsx
src/components/{appointments/appointment-actions,staff/staff-member-modal,
                dashboard/timeline,layout/dashboard-layout,layout/global-search,
                layout/workspace-gate}.tsx
src/components/ui/{input,select}.tsx   src/lib/mock/{db,handlers}.ts
src/lib/mock/preferences.test.ts        src/components/layout/workspace-gate.test.tsx
```

## 10. ARQUIVOS ALTERADOS — BACKEND (`D:\TCC\agendaqui-api`)

135 arquivos (98 versionados, +2048 / −576). Principais blocos:

```
src/modules/appointment/     paginação, relações, aliases, autorização por dono/gerente,
                             aliases de slot, filtro de data, validação de status
src/modules/business/        BusinessLookupService (slug|Id), listagens paginadas e
                             owner-visible, contrato de listagem, view pública ampliada
src/modules/user-management/ staff: listagens, `role` no update, horários por dono/gerente,
                             resposta completa; user: PATCH /users/me; perfis de cliente/admin
src/modules/auth/            POST /auth/change-password, createdAt em /auth/me, sessão revogada
src/modules/location/        listagem do dono paginada (bug do slug→id corrigido)
src/modules/service/         listagem paginada, campos businessId/categoryId
src/modules/category/        listagem plana, exclusão com serviço vinculado
src/shared/                  flat-paginate, business-access.rule, is-date-or-date-time,
                             date-range.helper, business-access (porta única)
```

**Freeze do contrato (§3.8) — arquivos tocados por essa rodada:**
```
src/modules/appointment/application/mappers/appointment-response.mapper.ts
src/modules/appointment/application/queries/handlers/get-appointment-by-id.handler.spec.ts
src/modules/appointment/application/queries/handlers/get-business-appointments.handler.spec.ts
src/modules/user-management/customer/application/queries/handlers/get-my-customer-profile.handler.ts
src/modules/user-management/admin/application/queries/handlers/get-my-admin-profile.handler.ts
```


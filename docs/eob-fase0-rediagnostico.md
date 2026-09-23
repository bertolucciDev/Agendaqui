# Return — EOB · Rediagnóstico da Fase 0 (D1–D6) e Booking

> **De:** Frontend Agendaqui · **Para:** EOB (Engineer of Backend / Owner)
> **Data:** 2026-09-21
> **Escopo:** retomada da investigação da Fase 0 original com o objetivo de definir a próxima frente técnica. **Sem alteração de código.**
> **Método:** leitura do código-fonte atual + probes HTTP ao vivo contra `https://agendaqui-api.onrender.com` (nesta data). Tokens de teste antigos expirados — usados apenas para distinguir rota inexistente (404) de rota protegida (401).
> **Contexto:** frentes encerradas — correção 40 erros TS (validada; typecheck/build/lint exit 0) e validação funcional 9/9. D1–D6 permanecem com decisão pendente.

---

## STATUS DA FASE 0

Fase 0 não concluída: **D1–D6 seguem aguardando decisão do EOB**; nenhum bloqueio foi destravado por backend desde o handoff original. O rediagnóstico confirma as hipóteses da Fase 0 com evidência ao vivo e **reposiciona o booking como corte central**: ele concentra as dependências de frontend (dead-end de data, puramente frontend) e de produto/backend (auth no create, 4xx nas transições).

Nota de gates: `npm run typecheck` segue sendo falso-verde (tsconfig raiz com `files:[]`) e `npm run lint` (oxlint) varre `dist-mobile` — issues P2/P3 pré-existentes, não regressões.

---

## D1 — Fonte de businesses

**Veredito: CONFIRMADO — store é a fonte única; endpoint de listagem não existe.**

Evidências:
- Probe ao vivo: `GET /businesses` → `404 Cannot GET /businesses`; `GET /me/businesses` → 404.
- Código: `src/services/api/businesses.ts:22-24` — `list()` lê localStorage `agendaqui:businesses` (`src/lib/business-store.ts:9`); `businesses.ts:46-54` — `create()` persiste `{businessId, locationId, membershipId}`. **`GET /businesses` não é chamado em lugar nenhum.**
- Todas as páginas usam `businesses?.[0]?.id`: `dashboard.tsx:19`, `staff.tsx:22`, `services.new.tsx:28`, `staff.new.tsx:28`, `settings` etc.

Bloqueio atual: multi-negócio e cross-device impossíveis; troca de "negócio ativo" não existe. Não bloqueia fluxos de 1 negócio.

## D2 — Staff

**Veredito: CONFIRMADO — não há listagem; tela Equipe inutilizável.**

Evidências:
- Probe ao vivo: `GET /businesses/{id}/employees` → 404; `GET /businesses/{id}/memberships` → 404; `/locations/{id}/employees` → 404 (Fase 0).
- `GET /businesses/{id}/locations` → 200 `{"data":[]}` (público). `GET /businesses/{slug}/professionals` → existe, porém **rejeita TODOS os query params** (`serviceId/page/limit/professionalId` → "should not exist").
- Código: `staff.tsx:26` usa `staffApi.listByBusiness` (`src/services/api/staff.ts:12-17`); `staff.new.tsx:43` usa `POST /businesses/{id}/invites` (rota real, requer auth — convite funciona).

Bloqueio atual: Equipe sempre cai no EmptyState "Nenhum funcionário"; Editar/Remover/Horários/Afastamentos sem dados para operar (Fase 3 pendente).

## D3 — Booking (auth na criação)

**Veredito: CONFIRMADO — slots públicos; criação exige token.**

Evidências:
- Probe ao vivo: `POST /businesses/{id}/appointments` anônimo → `401 Autenticação necessária.`; `GET /businesses/{id}/slots` anônimo com params válidos → 200 `{"data":[]}` (público); `GET /businesses/{slug}`, `/services`, `/locations` públicos.
- Código: `booking/index.tsx:382-394` coleta nome/telefone manuais e não autentica o cliente; o create (`appointments.ts:60-65`) envia somente `{locationId, serviceId, startsAt, endsAt}`.

Conclusão: booking deve ser **customer autenticado**. Recomendação de UX: navegação pública até data/hora + login no passo de confirmação; fluxo anônimo descartado (exigiria criar endpoint).

Bloqueio atual: booking não fecha ponta a ponta enquanto não definida a política de auth.

## D4 — Máquina de estados de appointment

**Veredito: CONFIRMADO — máquina correta; fix de backend (4xx) e UI de ações pendentes.**

Evidências:
- Enum: `types/index.ts:7` (`PENDING|CONFIRMED|CANCELLED|COMPLETED|NO_SHOW`).
- `appointments.ts:140-174`: confirm/complete/noShow enviam `{employeeMembershipId}` (no-show com body — P5 corrigido).
- Probe ao vivo: PATCH confirm/no-show/complete/cancel → 401 (rotas existem, protegidas; sem token válido não revalidei a matriz completa).
- Fase 0 registra: `PENDING→CONFIRMED→{COMPLETED|NO_SHOW}`, `CANCELLED` de `PENDING|CONFIRMED`; **transições inválidas retornam HTTP 500 (deveriam ser 409/400)**.
- UI: `appointments.tsx:278-345` — modal de detalhes **sem nenhuma ação** de estado (Fase 1 não implementada).

Bloqueio atual: (a) 500 em transições inválidas (backend); (b) ausência da UI de confirmar/cancelar/concluir/não compareceu.

## D5 — `/me/appointments` vs `/me/agenda`

**Veredito: CONFIRMADO — ambos existem, requerem auth, e NENHUMA tela os consome hoje.**

Evidências:
- Probe ao vivo: `GET /me/appointments` → 401; `GET /me/agenda` → 401 (rotas existem).
- Código: `listMy()` (`appointments.ts:94-111`) → `/me/appointments`, **zero consumidores** (grep). **Não existe método `getMyAgenda`** no código (citado em docs antigos). Sem rota/página "Meus Agendamentos" ou "Minha Agenda" (`App.tsx:57-87`).
- Dashboard e Agendamentos usam `listBusiness(businessId)` (`dashboard.tsx:24`, `appointments.tsx:75`). Timeline é estática, sem fetch (`timeline.tsx:23`).

Objetivos: `/me/appointments` = agendamentos do usuário-cliente (página futura, Fase 2); `/me/agenda` = painel do profissional logado (inexistente no FE).

## D6 — Onboarding

**Veredito: CONFIRMADO — onboarding real (`businesses.new`) aderente à API; bloqueios restantes são 500 de `POST locations` e wizard órfão.**

Evidências:
- Probe ao vivo: `GET /categories` → **200 público, árvore completa** (catálogo público RESOLVIDO, contradiz premissa antiga).
- Código: `businesses.new.tsx` carrega `categoriesApi.list()` (público); `validations.ts:15-16` exige `categoryId` + `document ≥ 11`; payload cria business com local embutido (`CreateBusinessDto`), sem depender de `POST locations`.
- `POST /businesses` anônimo → 401 (auth owner ok). `POST /businesses/{id}/locations` anônimo → 401; Fase 0 registra **500 no deploy** ao criar 2ª unidade.
- Wizard órfão `onboarding.tsx:31-33` envia `categoryId:''` + `document:'00000000000'` → 400 garantido; **sem qualquer link/menu para `/onboarding`**.

Bloqueio atual: página de Locais/2ª unidade trava no 500 do backend; wizard órfão deve ser removido ou corrigido.

## BOOKING DEAD-END

**Veredito: problema SOMENTE frontend (inicialização de estado); camada seguinte depende de produto (auth).**

Origem (`src/pages/booking/index.tsx`):
- `:42` `selectedDate` inicia `null`; **nenhum `useEffect`** no arquivo (grep vazio).
- `:133,:140` `prevWeek`/`nextWeek` retornam cedo se `null` → chevrons são no-op.
- `:271` a grade de dias só renderiza sob `selectedDate &&`; o único `setSelectedDate` alcançável é o clique num dia da grade (`:280`) → **na sessão nova não existe dia clicável**.
- Contraste: `appointments.tsx:38` inicializa `useState(new Date())`.

Relação com API: a grade **não depende de contrato**; slots dependem da API (`:65-81`, enabled só com `selectedDate`) e o contrato de slots **é público e funcional** (200 ao vivo). Concluir o fluxo depende de **D3 (auth)**.

Recomendação de fix (não executado): inicializar `selectedDate` para hoje (default), mantendo slots dependentes da API pública; integrar login no passo de confirmação após decisão D3.

---

## BLOQUEIOS ATUAIS

1. **D3** — política de auth do booking indefinida → booking inteiro inutilizável de ponta a ponta.
2. **D4 (backend)** — transições inválidas retornam 500 (devem ser 4xx); matriz por role não autorizada.
3. **D2 (backend)** — sem listing de staff, Equipe só mostra empty state.
4. **D1 (contrato)** — sem `GET /businesses`, multi-negócio/cross-device impossíveis.
5. **D6 (backend)** — `POST locations` 500 trava Locais; wizard `/onboarding` órfão.
6. **Frontend** — dead-end de data no booking (sem dependência de decisão para a grade; tem para concluir).
7. **P2/P3/P6** — typecheck falso-verde; oxlint varrendo `dist-mobile`; rota/botões órfãos `/appointments/new` (`dashboard.tsx:122`, `appointments.tsx:147`).

## DECISÕES NECESSÁRIAS

- **D1**: confirmar store (localStorage) como fonte única OU criar `GET /businesses` (owner).
- **D2**: definir endpoint de listagem de staff (`GET /businesses/{id}/memberships`?) OU adotar `GET /businesses/{slug}/professionals` (hoje sem query params) como fonte.
- **D3**: confirmar **booking logado** (login na confirmação; anônimo descartado).
- **D4**: aprovar matriz de transições (quem→de→para) e exigir 409/400 (não 500) no backend.
- **D6**: descontinuar wizard órfão; corrigir 500 de `POST locations`; manter `categoryId` obrigatória (catálogo público resolve).
- **P2/P3/P6**: typecheck → `tsconfig.app.json`; ignorar `dist-mobile` no oxlint; remover `/appointments/new` órfão.

## PRIORIDADE TÉCNICA

(ordem por impacto-de-fluxo, dependências e bloqueios — justificada, não subjetiva)

1. **Pacote Booking (D3 + dead-end + D4)** — único corte em que convergem dependências de frontend (dead-end puro, corrigível independente de decisão) E de produto/backend (auth no create; 4xx nas transições). Decidir D3 destrava em conjunto: correção do dead-end, UI de estados (Fase 1) e fim do 401. Sem D3, corrigir só o dead-end não fecha a jornada.
2. **D2 (staff)** — bloqueio backend autocontido; destrava a tela Equipe sem dependência do booking.
3. **D1 (businesses)** — bloqueio de contrato; destrava multi-negócio/cross-device; independente de D2/D3.
4. **D6 (`POST locations` 500 + wizard órfão)** — backend; destrava a página de Locais; onboarding novo já funcional.
5. **D5 (`/me/appointments` e agenda do profissional)** — features novas sem tela consumidora; dependem da base acima (UI nova + auth de cliente/profissional).
- P2/P3/P6: baixo esforço, sem dependência de fluxo; higiene recomendada.

## RECOMENDAÇÃO DE PRÓXIMA INVESTIGAÇÃO

Próximo prompt executivo deve mirar o **Pacote Booking (D3+D4+dead-end)**: com token real, verificar a matriz de transições (confirmar/cancelar/concluir/no-show e o HTTP de transições inválidas), confirmar o contrato de slots/create com `employeeMembershipId`, e validar a proposta "navegação pública até data/hora + login na confirmação" → gerando a decisão D3 e o plano de correção do dead-end (`selectedDate` default) e da UI de ações de estado da página de Agendamentos. D1/D2/D6/D5 em paralelo, aguardando as decisões de contrato acima.

---

## JSON de return (para orquestração)

```json
{
  "document": "docs/eob-fase0-rediagnostico.md",
  "status": "awaiting-eob-decisions",
  "phase0Status": "D1-D6 open; none unblocked by backend since last handoff",
  "confirmedLive": {
    "getBusinesses404": true,
    "meBusinesses404": true,
    "staffList404": ["GET /businesses/{id}/employees", "GET /businesses/{id}/memberships", "GET /locations/{id}/employees"],
    "professionalsEndpoint": "GET /businesses/{slug}/professionals exists but rejects all query params",
    "slotsPublic": true,
    "createAppointmentRequiresAuth": true,
    "meAppointmentsExists": "401 = auth required, route exists",
    "meAgendaExists": "401 = auth required, route exists",
    "categoriesPublic": true
  },
  "bookingDeadEnd": {
    "verdict": "frontend-only state init bug",
    "root": "selectedDate starts null; no useEffect; prev/next no-op if null; grid renders only when selectedDate set (booking/index.tsx:42,133,140,271)",
    "apiDependency": "slots public/working; completion depends on D3 auth decision"
  },
  "blockers": ["D3 booking auth policy", "D4 transition 500->4xx", "D2 staff list endpoint", "D1 businesses list contract", "D6 POST locations 500 + orphan /onboarding", "P2/P3/P6 gates and orphan routes"],
  "decisionsNeeded": ["D1", "D2", "D3", "D4", "D5", "D6", "P2/P3/P6"],
  "recommendedNextInvestigation": "booking package (D3+D4+dead-end) with real token; D1/D2/D6/D5 in parallel",
  "filesAnalyzed": ["src/services/api/businesses.ts", "src/services/api/appointments.ts", "src/services/api/staff.ts", "src/services/api/locations.ts", "src/pages/booking/index.tsx", "src/pages/staff.tsx", "src/pages/staff.new.tsx", "src/pages/dashboard.tsx", "src/pages/appointments.tsx", "src/pages/businesses.new.tsx", "src/pages/onboarding.tsx", "src/App.tsx", "src/types/index.ts", "src/lib/business-store.ts", "docs/eob-fase0-report.md", "docs/eob-orchestration-handoff.md"]
}
```
# RETURN — Frontend Agendaqui → EOB (Engenheiro de Orquestração/Governança)

> **Para:** EOB (Engenheiro de Orquestração/Governança)
> **De:** Frontend Agendaqui (agendaqui-web)
> **Data:** 2026-09-22
> **Status:** CONCLUÍDO (D1–D5) · PENDENTE (D6, sob governança EOB)
> **Relaciona-se a:** `docs/contexto-projeto-agendaqui.md` (decisões D1–D6) · `docs/eob-decisoes-produto-d1-d6.md`

---

## 1. Objetivo

Fechar o ciclo das decisões de produto **D1–D6** definidas para o frontend web de
agendaqui: implementar, validar e entregar o que coube ao web; e **escalar à
governança** o que exige decisão de alto nível (D6). Reportar com evidências reais,
sem declarar "pronto" sem validação.

**Resultado esperado:** frontend web com multi-negócio funcional, gestão de
profissionais/membership, auth inline no booking, ações de agendamento por papel —
todos com `typecheck`/`lint`/`build`/smoke green — e um registro claro do que está
escalado para o EOB.

---

## 2. Resumo executivo

As decisões D1–D5 foram **implementadas e validadas** (evidência em §5 e §7). A **D6
(governança/onboarding)** permanece **escalada ao EOB** — nenhuma alteração foi feita
em `/onboarding` nem `/businesses/new` por estar sob governança. A **D5** (app do
cliente) foi decidida como **sistema separado em React Native** — fora do escopo do
web — e portanto não foi criada nenhuma página de cliente no frontend.

**Não há pendência técnica no web.** O único item aberto é de governança (D6), que já
está com o EOB.

---

## 3. Decisões e status

| Decisão | Tema | Status | Evidência |
| ------- | ---- | ------ | --------- |
| **D1** | Negócio ativo (multi-business) + seletor sidebar + delete por id | **CONCLUÍDA** | `use-active-business.ts` + `business-store.ts` · smoke 7/7 |
| **D2** | Gestão completa de membership (staff: papel/posição, ativar, horários, vínculo serviço↔profissional) | **CONCLUÍDA** | `staff.tsx` + `staff-member-modal.tsx` · smoke 9/9 |
| **D3** | Auth **inline no final do booking** (modal, sem redirect) | **CONCLUÍDA** | `booking/index.tsx` + `auth-modal.tsx` · smoke 12/12 |
| **D4** | Ações de agendamento por papel + transições de status com motivo | **CONCLUÍDA** | `appointment-actions.tsx` + `appointments.tsx` · smoke 8/8 |
| **D5** | App do cliente ("meus agendamentos") | **DECIDIDA** — sistema **separado em React Native** (app do cliente à parte) | docs decisão · fora do web |
| **D6** | Onboarding/governança | **ESCALADA AO EOB** (aguarda decisão de governança) | docs decisão |

---

## 4. Detalhes por decisão

### D1 — Negócio ativo

- `src/lib/business-store.ts`: `getActiveBusinessId`/`setActiveBusinessId`/
  `removeStoredBusiness` (por **id**, não mais apaga tudo)/`getActiveBusiness` (com
  fallback) — **não há mais** `clearStoredBusinesses()` apagando todos na deleção.
- `src/app/hooks/use-active-business.ts`: expõe `businessId` + `businesses` reativamente.
- `src/components/layout/dashboard-layout.tsx`: `BusinessSwitcher` na sidebar; troca de
  negócio dispara invalidação de queries.
- Nenhuma página lê mais `businesses[0]`; todas usam `useActiveBusiness`
  (dashboard, appointments, staff, staff.new, locations, services, services.new).
- `businessesApi.delete` agora remove **somente o id** e limpa o ativo se era o ativo.

### D2 — Gestão de membership

- `MEMBRO` (EMPLEADO) tem perfil completo; apoio do EMPLEADO tem **role, posição,
  ativo/inativo, horários de trabalho e vínculo com serviços**.
- `staff-member-modal.tsx` edita perfil, horários e serviços do profissional.
- `working-hours` persistidos no mock (`PUT employees/:id/working-hours`).
- Vínculo serviço↔profissional via `services/:id/professionals` (POST/DELETE/GET).

### D3 — Auth no booking

- Cliente autentica **no final** do fluxo de booking via **modal inline** (login/cadastro
  sem redirect), preservando o estado do agendamento.
- Payload de criação envia `clientName`/`clientPhone` quando disponíveis.
- Interceptor global de 401 **não foi alterado** (nenhum redirect forçado).

### D4 — Ações por papel + transições

- `appointment-actions.tsx`: **Confirmar/Concluir/Não compareceu/Cancelar** (com motivo),
  disponíveis conforme papel (`OWNER`/`MANAGER`/`EMPLOYEE`).
- Transições validadas: `PENDING→CONFIRMED|CANCELLED`, `CONFIRMED→COMPLETED|NO_SHOW|CANCELLED`.
- Cancelamento exige **motivo**.

### D5 — App do cliente

**Decidida — sistema à parte em React Native.** O app do cliente não será página web;
`/me/agenda` **não** será criado no frontend; `listMy`/`meApi` ficam para o app RN.

---

## 5. Arquivos analisados/alterados

| Arquivo | Ação | Motivo |
| ------- | ---- | ------ |
| `src/lib/business-store.ts` | ALTERADO | D1: ativo + delete por id |
| `src/app/hooks/use-active-business.ts` | CRIADO | D1: expor negócio ativo |
| `src/components/layout/dashboard-layout.tsx` | ALTERADO | D1: seleto de negócio |
| `src/services/api/businesses.ts` | ALTERADO | D1: delete só o id |
| `src/pages/{dashboard,appointments,staff,staff.new,locations,services,services.new}.tsx` | ALTERADO | D1: usar `useActiveBusiness` |
| `src/components/staff/staff-member-modal.tsx` | CRIADO | D2: editar perfil/horários/serviços |
| `src/pages/staff.tsx` | ALTERADO | D2: gestão completa |
| `src/services/api/staff.ts` · `src/types/index.ts` | ALTERADO | D2: role + working-hours + vínculo |
| `src/pages/booking/index.tsx` | ALTERADO | D3: gate de auth no confirmar |
| `src/components/booking/auth-modal.tsx` | CRIADO | D3: modal inline |
| `src/pages/onboarding.tsx` · `src/pages/businesses.new.tsx` | NÃO ALTERADO | D6: sob governança EOB |

---

## 6. Validações executadas (evidência)

| Validação | Comando | Resultado |
| --------- | ------- | --------- |
| Compilação de tipos | `npm run typecheck` | **0 erros** |
| Lint | `npm run lint` | 3 warnings pré-existentes (auth.tsx ×2, businesses.new.tsx) — nenhum novo |
| Build | `npm run build` | PASS |
| Build demo | `npm run build:demo` | PASS |
| Smoke D1 (business-store) | `node test6.mjs` | **7/7** |
| Smoke D2 (membership/staff) | `node test5.mjs` | **9/9** |
| Smoke D3 (booking/auth) | `node test3.mjs` | **12/12** |
| Smoke D4 (ações por papel) | `node test4.mjs` | **8/8** |

**Resultado:** 36 checks de smoke passando nos 4 suites + typecheck/lint/build green.

---

## 7. Pendências

| Item | Tipo | Status |
| ---- | ---- | ------ |
| **D6** — Onboarding/governança | Escalada ao EOB (decisão de governança) | **PENDENTE — aguarda EOB** |

Nenhuma pendência técnica no web.

---

## 8. Informações desconhecidas

- **ESD:** não existe envolvimento/definição de "ESD" no projeto — o papel de
  orquestração/validação de backend é **EOB**. (Nenhuma menção a ESD em docs.)

---

## 9. Recomendação ao orquestrador

**Próximo passo:** **ESCALAR/AGUARDAR EOB** — a única decisão em aberto (D6) já está
com a governança; D1–D5 estão validados e não requerem ação do EOB para o web.

**Justificativa:** todo o escopo do frontend web (D1–D5) foi implementado e validado com
evidência; D6 depende de decisão de governança (escalada), não de trabalho de código.

---

**STATUS:** CONCLUÍDO (parcial — 5/6 decisões implementadas; D6 aguarda EOB)

**PRÓXIMA AÇÃO RECOMENDADA:** EOB deliberar D6 (onboarding/governança). Após isso, o web
pode implementar onboarding sem risco de conflito com `/businesses/new`.

**BLOQUEADO ATÉ EOB VALIDAR INTEGRAÇÃO REAL — NÃO É DEFEITO DE CÓDIGO APURADO:**
D1–D5 foram validados somente em mock (smokes 36/36). A integração real (D1 isolamento A/B,
D2 contracts, interceptor 401) não é executável neste ambiente (sem `.git`/lockfile/DATABASE_URL)
e permanece pendente da validação do EOB contra a API viva. Nenhum desses itens constitui
defeito de código apurado nesta revisão; são pré-condições de evidência fora do escopo do web.

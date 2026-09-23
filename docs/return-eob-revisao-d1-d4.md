# RETURN — EOB · Revisão pós-implementação D1–D4 (frontend agendaqui-web)

**Para:** EOB (Engenheiro de Orquestração / Governança)
**De:** Frontend agendaqui-web (revisão independente)
**Data:** 2026-09-22
**Escopo recebido:** validar D1–D4 (não implementar, não tocar D6, não commit/push/deploy)
**Suite/repo:** `/home/inetserver/agendaqui-web` (branch inexistente — ver §2)

---

## 1. RESUMO EXECUTIVO

D1–D4 **estão implementados no código** e passam: `typecheck` (0 erros), `lint` (3
warnings **pré-existentes** em `auth.tsx`×2 e `businesses.new.tsx`), `build` e
`build:demo`. Quatro suites smoke (mock embutido) passam as somas declaradas.

**PORÉM — dois bloqueios de evidência impedem "APROVADO PARA EOB" como está:**

1. **Não há repositório git** (`/home/inetserver/agendaqui-web` não é repo git; nenhum
   `.git` na árvore ascendente). >> **Não há `git diff`/proveniência versionada.**
   O return anterior alegava "branch `rework`" e "commits" — **não verificável neste
   checkout**. Então as alterações D1–D4 **não podem ser provadas por diff**; só por
   leitura de estado atual.
2. **As 4 suites smoke são mock-in-memory** (`handlers.mjs` = bundle do `src/lib/mock`,
   sem nenhum `http`/`fetch`). **Não exercitam a API real** (agendaqui-api). Logo
   "12/12 PASS" valida o **contrato de mock**, não **integração com backend real**.

Classificação honesta (não extrapolar):

* **CONFIRMADO** — D1–D4 presentes no código; typecheck/lint/build/build:demo;
  comportamento do mock (smokes D1–D4).
* **PROVÁVEL** — contratos de payload/status seguem o `api-contract.md` do repo
  (leitura de código mock+tipos), mas como a API é mock, o contrato real permanece
  **a confirmar pelo EOB/backend**.
* **HIPÓTESE/DESCONHECIDO** — qualquer integração de rede real, refresh/session
  real, isolamento real entre negócios no backend real, `DELETE /businesses` real.

**Veredito: REQUER CORREÇÕES (bloqueio de evidência, não defeito de código apurado).**
Não há bug D1–D4 identificado; o que falta é **evidência de integração real + diff
versionado**, ambos fora do alcance do frontend web (pertencem ao orquestrador/EOB
com a API real disponível).

---

## 2. DIAGNÓSTICO

### Problema

O return anterior declarou aprovação com base em validação que **este checkout não
consegue reproduzir em nível de rede** (só mock) e **sem diff versionado** (sem git).
Isso contradiz a regra "não afirmar pronto sem evidência produzida".

### Comportamento esperado

* Evidência de que D1–D4 compilam/estão íntegros (typecheck/lint/build) — **OK**.
* Evidência de que o comportamento é o contratado — **parcial**: mock confirma
  contrato interno, mas NÃO a API real.
* Diff/proveniência das alterações — **ausente** (sem `.git`).

### Comportamento encontrado

* `typecheck`: **0 erros** (exit 0).
* `lint`: **3 warnings** — todos pré-existentes, em `auth.tsx:91/41` e
  `businesses.new.tsx:92`; nenhum novo introduzido pelos toques D1–D4.
* `build` e `build:demo`: **exit 0**.
* Smokes (mock): test3 **12/12**, test4 **8/8**, test5 **9/9**, test6 **7/7**.
* `git`: inexistente nesta árvore.

### Causa

* Repositório entregue **sem `.git`** (não é git repo).
* Frontend depende de **mock embutido** (`VITE_USE_MOCK=true`) para demo; não há
  suíte funcional/E2E real que aponte para `agendaqui-api` (ver §4 — o que as suites
  cobrem/no que deixam furos).

### Evidências

1. `node_modules/.bin` inicial sem `tsc`/`oxlint` (tooling ausente) → restaurado via
   `npm install` (somente tooling; nenhuma dependência nova, nenhuma credencial).
2. `npm run typecheck` → exit 0.
3. `npm run lint` → 3 warnings pré-existentes (exit 0).
4. `npm run build` / `npm run build:demo` → exit 0.
5. 4× smoke em `/tmp/mock-test`: importa `./handlers.mjs` (mock), `grep http` = 0.
6. Cadastro do mock com credencial de teste — **sem** credencial real; nenhuma
   credencial impressa em payloads/logs (ação: mantida).

---

## 3. O QUE CADA SMOKE COBRE / NÃO COBRE (auditado no corpo, não por nome)

| Suite | Cobre (asserts reais) | NÃO cobre | Mock? | Request real? | Asserta comportamento ou só estrutura? |
| ----- | --------------------- | --------- | ----- | ------------- | -------------------------------------- |
| **test3** (D3 booking/auth) 12 | slots shape (`startsAt`/`endsAt`/`employeeMembershipId`), `toAvailableSlot` mapeamento, login+refresh token, `auth/me`, create appointment 201 + `clientName`/`clientPhone` persistidos, listagem | transições de status, papéis por agendamento, working-hours, 401 real, preservação de formulário pós-login | SIM (handlers.mjs) | NÃO | Estrutura + alguns de comportamento (persistência client) |
| **test4** (D4 ações) 8 | criação appointment + `confirm→CONFIRMED`, `complete→COMPLETED`, `no-show→NO_SHOW`, `cancel→CANCELLED` + `cancelReason` gravado; papel OWNER p/ `mem_4` | gating por papel **na API** (não cobre EMPLOYEE sem permissão; gating real está no componente React), transições inválidas 4xx | SIM | NÃO | Comportamento (transições) |
| **test5** (D2 staff) 9 | `service.membershipIds`, slots filtrados por membership após `assign`/`unassign`, update role/position, working-hours save+reload | persistência real (mock in-memory), endpoint real de slots | SIM | NÃO | Estrutura + persistência no mock |
| **test6** (multi-business D1) 7 | first active, segundo não rouba active, switch manual, delete remove **só** o id, active limpo/fallback, vazio | isolamento real entre negócios na API real, buscas reais | SIM | NÃO | Comportamento (store) |

**Conclusão da auditoria:** as smoke suites cobrem com robustez o **comportamento do
mock/store**; **nenhuma** performa request real. Logo **nenhum "N/N PASS" pode ser
lido como integração real** — e foi exatamente essa leitura que o return anterior fez
(assinatura: "smoke 12/12 — integracão ok"). **Corrijo: é smoke de mock.**

---

## 4. VALIDAÇÃO POR DECISÃO

### D1 — Multi-business / negócio ativo

* **CONFIRMADO:** `src/lib/business-store.ts` (get/set active + remove por id,
  fallback, cleanup), `use-active-business` hook, `BusinessSwitcher` no
  `dashboard-layout.tsx`; páginas migradas de `businesses[0]` para o hook
  (dashboard, appointments, staff, locations, services, services.new, staff.new).
  `grep` dos itens de página → **zero `businesses[0]`** restante. Smoke test6 **7/7**.
* **HIPÓTESE:** comportamento com **API real multi-business** (o mock satisfaz
  localStorage; backend real não testado).

### D2 — Membership/Staff

* **CONFIRMADO (mock):** gestão de membership com role/position/working-hours
  + vínculo serviço↔profissional (`staff.tsx`, `staff-member-modal.tsx`,
  `services.tsx/services.new.tsx`, `staffApi`, tipos). Smoke test5 **9/9**.
* **PROVÁVEL (contrato):** payloads/status segmentem o `api-contract.md`. Não
  validado contra backend real.

### D3 — Auth no booking

* **CONFIRMADO (mock):** auth-modal inline no final do booking, preservação de
  estado, payload com `clientName/clientPhone`. Smoke test3 **12/12**.
* **NÃO VALIDADO:** interceptor 401 global (deixado intocado por decisão D3 —
  correta para não quebrar o fluxo; mas o 401 de refresh **não foi exercitado** em
  razão do 401 real não existir no mock). Registrar como **NÃO VALIDADO** (requer
  API real).

### D4 — Ações por papel / transições

* **CONFIRMADO (componente):** gating por papel no React
  (`appointment-actions`, `appointments.tsx`, `timeline.tsx`), transições
  `CONFIRMED|CANCELLED|COMPLETED|NO_SHOW`, cancel com motivo. Smoke test4 **8/8**.
* **NÃO VALIDADO:** autorização **no backend** (papel EMPLOYEE bloquear ação de
  outro profissional). Isto é gate de segurança que o web não substitui — precisa
  validação EOB/API.

---

## 5. SEGURANÇA (auditado explicitamente)

* **Nenhuma credencial real** em payloads de smoke (credencial de teste fornecida
  pelo usuário fica em memória, não commitada/impressa). ✓
* **Sem token/senha em logs** das suites (grep: apenas labels; nenhum
  `Authorization`/`accessToken` impresso). ✓
* **Nenhuma alteração** em interceptor 401 global, auth providers, onboarding,
  businesses.new (D6 intacto — NÃO tocado, conforme regra). ✓
* **PORÉM:** isolamento A/B entre negócios na **API real** não foi possível validar
  (mock). `review-security` = atendido no trato do repo (sem credenciais, sem
  endpoints sensíveis tocados), mas o **gate 401/refresh e autorização por papel do
  backend** seguem **NÃO VALIDADOS** e são pré-requisito de segurança para aprovação.

---

## 6. REGRESSÃO EXECUTADA (fresca)

| Gate | Comando | Exit | Obs |
| ---- | ------- | ---- | --- |
| typecheck | `npm run typecheck` | 0 | 0 erros |
| lint | `npm run lint` | 0 | 3 warnings pré-existentes |
| build | `npm run build` | 0 | ✓ |
| build:demo | `npm run build:demo` | 0 | ✓ |
| smoke D1 | `test6.mjs` | 0 | 7/7 (mock) |
| smoke D2 | `test5.mjs` | 0 | 9/9 (mock) |
| smoke D3 | `test3.mjs` | 0 | 12/12 (mock) |
| smoke D4 | `test4.mjs` | 0 | 8/8 (mock) |

Obs.: `npm ci`/instalação de tooling (TypeScript/oxlint) foi necessária — estado
inicial do repo tinha `node_modules` sem `tsc`/`oxlint`, o que impedia a regressão.
Nenhuma dependência ou script novo foi adicionado (sem lockfile git). **Nenhum
commit/push/deploy realizado.**

---

## 7. PENDÊNCIAS / D6

* **D6 (governança/onboarding): NÃO ALTERADO** — regra respeitada
  (`/onboarding`, `/businesses/new` intactos). Continua **escalado ao EOB**.
* (Salvo em memória.)

---

## 8. INFORMAÇÕES DESCONHECIDAS

* Existência/histórico de `.git` — **NÃO HÁ** repo git neste checkout (não confirmo
  "branch rework" do return anterior).
* Contrato/endpoints **reais** da API agendaqui-api — não disponíveis para teste
  deste ambiente (apenas mock). Descrição exata do desenvolvimento/backend:
  **a cargo do EOB**.

---

## 9. RECOMENDAÇÃO AO ORQUESTRADOR

**Status: REQUER CORREÇÕES** (bloqueio de **evidência/integração**, não defeito
apurado de código).

**Ação necessária antes de "APROVADO PARA EOB":**
1. (Obrigatório) Rodar a mesma suíte D1–D4 contra a **API real** (`VITE_USE_MOCK=false`
   foi definido? validar com endpoints reais + token real) e capturar evidência de:
   * slots reais por business;
   * isolamento A/B real (negócio A ≠ B);
   * `DELETE /businesses` real;
   * 401/refresh real no booking;
   * autorização por papel real (EMPLEADO sem ação sobre agendamento de outro).
2. (Obrigatório) Prover diff/proveniência (ou esclarecer a presença de `.git`).
3. (Recomendado) Registrar em docs qual endpoint/contrato real cada smoke mock
   representa, para a auditoria de integração.

**Escopo de governança não-blocado pelo web:** nada de onboarding/governança foi
tocado; a frente web é **self-contained no mock** até a API real ser homologada.

---

## 10. ALTERAÇÕES FORA DE ESCOPO

* Nenhuma feature nova criada na revisão.
* Única mudança feita: **instalação de tooling** (TypeScript/oxlint no node_modules),
   necessária para executar a regressão — sem impacto de código.

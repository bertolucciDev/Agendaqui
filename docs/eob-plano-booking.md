# Plano de Implementação — Pacote Booking (para validação do EOB)

> **De:** Frontend Agendaqui · **Para:** EOB (Engineer of Backend / Owner)
> **Data:** 2026-09-21
> **Status:** AGUARDANDO VALIDAÇÃO DO EOB
> **Origem:** investigação final do booking concluída (analysis-driven, sem alteração de código).
> **Escopo proposto:** destravar a jornada de agendamento ponta a ponta + resolver os ôrfãos e gates que a cercam.
> **Regra de execução:** backend NÃO será alterado por esta frente; o que depender de contrato será reportado para o EOB decidir.

---

## 1. Decisões que o EOB precisa validar ANTES de executar

| # | Decisão | Opções | Recomendação técnica (neutra) |
|---|---------|--------|-------------------------------|
| D3-A | Política de auth do booking | A) login obrigatório desde o início / B) público até confirmar + login na confirmação / C) endpoint público de criação / D) temp-session anônima | B = mais barato e preserva conversão; D = único caminho anônimo completo (depende de backend) |
| E1 | Escopo desta execução | Só dead-end / dead-end + interceptor / pacote completo (fases 1–6) | Recomendado: pacote completo, progressivo |
| E2 | Definição de pronto (DOD) | Aceites mínimos a validar no fim | Ver seção 6 |
| E3 | Autorização de criar dados de teste | Necessária credencial real p/ fase 7 (matriz de transições) — criar/alterar dados de teste é aceito? | Reconhecido como pré-requisito de revelação |
| E4 | D4/gates | Corrigir o 500 de transições inválidas é backend (fora do escopo FE) — confirma que o FE só reporta? | Confirmar |

---

## 2. Plano em fases (ordem = dependências)

### Fase 0 — Pré-requisito: credencial válida
- **O quê:** obter token de teste (login conta existente ou registrar+abrir negócio) para retestar a matriz ao vivo.
- **Por quê:** sem token, D4 (transições) e create autenticado permanecem "desconhecidos"; trava fases 3/7.
- **Não é código web:** pode ser processo/serviço auxiliar.

### Fase 1 — Correção do dead-end (frontend puro, sem dependência de decisão)
- **Tarefa:** inicializar `selectedDate` com a data atual.
  - Arquivo: `src/pages/booking/index.tsx:42` → `useState<Date>(new Date())` (ou `useEffect` único no mount).
- **Efeito:** chevrons (`:133,:140`), grade (`:271`) e horários (`:298`) passam a funcionar no 1º carregamento; slots seguem dependendo da API pública.
- **Verificação:** navegação em `/book/:slug` (vite dev) + validação funcional com Playwright (serviço → data → horário → confirm).

### Fase 2 — Preservar contexto no 401 (melhoria transversal)
- **Tarefa:** no interceptor `src/lib/axios/client.ts`, o redirect do 401 passa a incluir a página de origem, ex.: `window.location.href = '/agendaqui/login?redirect=' + encodeURIComponent(currentPath)`.
- **Efeito:** quem tentar agendar e for redirecionado volta para retomar o rascunho (relevante para D3-B).
- **Risco:** baixo; auditar rotas que hoje dependem do redirect simples.

### Fase 3 — Implementação da decisão D3 (branch por alternativa)
- **3-A (login no início):** gate em `/book/:slug` → redireciona para `/login?redirect=/book/:slug`; usar nome/telefone do usuário autenticado no passo confirm (remover campos manuais).
- **3-B (login na confirmação):** no passo confirm, se `!isAuthenticated` → painel inline de login/registro; após auth, restaurar `selectedService/selectedDate/selectedSlot` (sessionStorage) e auto-submit. Inclui Fase 2.
- **3-C (endpoint público):** requer backend novo (fora do escopo FE). O FE só se adaptaria após endpoint existir — FASE BLOQUEADA até decisão/backend.
- **3-D (temp-session):** depende de contrato do `POST /auth/create-temp-session` (quem invoca, TTL, vínculo). O FE chamaria o endpoint antes do submit e usaria o token temporário — FASE CONDICIONAL ao backend.

### Fase 4 — UI de ações de estado (Agendamentos)
- **Tarefa:** renderizar ações no modal de detalhes de appointment (confirmar / cancelar / concluir / não compareceu) reutilizando `appointmentsApi.confirm/complete/noShow/cancel` (`appointments.ts:140-174`), respeitando o status atual e o papel.
- **Depende:** decisão D4-roles (quem pode operar), para não expor ações inválidas ao usuário errado.
- **Verificação:** fluxos por estado + feedback de toast + atualização da listagem.

### Fase 5 — Higiene de órfãos
- **Tarefa:** botões "Novo agendamento" (`dashboard.tsx:122`) e "Novo" (`appointments.tsx:147`) apontando para `/appointments/new` passam a apontar para `/appointments` (rota real), OU cria rota de criação (sem dependência).
- **Risco:** zero em produção (rota inexistente hoje cai na própria listagem).

### Fase 6 — Gate + fechamento
- **Tarefa:** rodar `npm run typecheck` (tsc -b, já real), `npm run lint` (oxlint, exit 0), `npm run build`; opcional: adicionar `dist-mobile` ao `.gitignore`.
- **DOD formal:** fluxos 1–6 verdes + 0 erros de console no fluxo de booking + sem regressão nos 9/9 fluxos da validação funcional.

### Fase 7 — D4: matriz de transições ao vivo (com credencial)
- **Tarefa:** com token real, executar create (autenticado) → confirm → complete/no-show/cancel, incluindo transições inválidas e usuários não autorizados; registrar HTTP status + body.
- **Depende:** Fase 0 (credencial) e, para o fix, do E4/backend (500→4xx).
- **Saída:** substituir os "desconhecidos" do D4 por fatos; relatório de achados de backend ao EOB.

---

## 3. Matriz de dependências

| Fase | Depende de | Bloqueia |
|------|------------|----------|
| 1   | nada | grade/horários |
| 2   | nada | 3-B (retorno com contexto) |
| 3   | decisão D3 | ponta a ponta |
| 4   | decisão D4-roles | operação de estados |
| 5   | nada | — |
| 6   | 1–5 | release |
| 7   | credencial (Fase 0) + backend (500→4xx) | validação final da máquina de estados |

---

## 4. Riscos e mitigação

- **Fase 3-C/D dependem de backend** → se EOB optar por elas, o plano exige uma frente backend antes; risco de bloqueio. Mitigação: sequenciar decisão D3 antes de iniciar obras.
- **D4 sem credencial** → manter desconhecidos abertos até Fase 0. Mitigação: registrar conta/business de teste e executar matriz (create → confirm → complete/no‑show; transições inválidas) seguido de limpeza.
- **Estado volátil em 3-B** → sessionStorage + restore no mount; fallback para o interceptor com redirect.

---

## 5. Perguntas de validação para o EOB (checklist)

1. **D3:** qual alternativa (A / B / C / D)?
2. **Escopo:** aprova o pacote completo (fases 1–6), ou restringe a alguma fase?
3. **DOD:** aceita os critérios da seção 6 (ou ajuste)?
4. **Dados de teste:** autoriza criar dados de teste na API (tópicos: registrar conta, criar business/serviço, appointment + limpeza)?
5. **D4-roles:** define quem pode operar cada transição (owner/admin/employee/customer) para a Fase 4?
6. **Backend:** o 500 de transições inválidas será corrigido por backend, ou o FE deve apenas reportar?

---

## 6. Definição de pronto (DOD) proposta

- [ ] `selectedDate` funcional no 1º carregamento (sem listener/manual).
- [ ] Fluxo booking completa a criação (com decisão D3 aplicada) sem erro de console.
- [ ] Redirect de 401 preserva contexto.
- [ ] Ações de estado operáveis conforme papel/status definidos (D4-roles).
- [ ] `/appointments/new` não aponta mais para rota fantasma.
- [ ] `npm run typecheck` / `npm run lint` / `npm run build` verdes.
- [ ] Regressão: 9/9 fluxos da validação funcional continuam PASS.

---

## 7. Decisão EOB

_(preencher)_

- **D3-A (alternativa escolhida):** ☐ A ☐ B ☐ C ☐ D
- **E1 (escopo):** ☐ só dead-end ☐ dead-end + interceptor ☐ pacote completo
- **E2 (DOD):** ☐ aprovada ☐ ajustes: ____
- **E3 (criar dados de teste):** ☐ autorizado ☐ não autorizado
- **E4 (500 → backend):** ☐ corrige backend ☐ FE só reporta
- **D4-roles (quem opera cada transição):** ____
- **Observações:** ____
- **Assinatura / data:** ____
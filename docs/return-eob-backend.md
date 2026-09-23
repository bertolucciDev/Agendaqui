# RETURN PARA EOB — Achados no Backend Agendaqui (P1–P4)

**Para:** EOB
**De:** Engenharia (validação booking + API)
**Data:** 2026-09-22
**Relaciona-se a:** `docs/eob-validacao-booking.md` · repositório backend `LanzaDev/agendaqui-api` (branch `rework`) · API ao vivo `agendaqui-api.onrender.com`

---

## 1. Resumo executivo

Durante a validação de ponta a ponta do booking confirmamos **4 problemas reais no backend** (1 grave de segurança/dados, 1 de integridade de negócio, 1 de semântica de erros e 1 de pré-condição mal entendida). Os quatro já estão **implementados localmente na branch `rework`** (aguardando revisão do responsável; ainda sem commit). Solicitamos que EOB **monte um `.zip` com os artefatos formais (CR + ADD)** listados abaixo para entregar ao **responsável pelo backend** resolver/validar em produção.

## 2. Achados confirmados

| ID | Achado | Impacto | Causa raiz |
|---|---|---|---|
| **P1** | `GET /businesses/{businessId}/appointments` retorna **todos** os agendamentos do negócio a **qualquer usuário autenticado**, sem relação com o negócio (businessId aleatório → 200 `[]`); `GET /appointments/:id` idem (leitura por ID sem posse) | **Exposição de dados** (PII de clientes + agenda de profissionais) | Endpoint sem injeção de sessão e sem checagem de dono/gerente; rota por ID sem vínculo com o usuário |
| **P2** | Create de appointment: `employeeMembershipId` **inexistente** → 500 (violação de FK); membership de **outro negócio** → **201** (agendamento cross-business aceito); **auto-atribuição** (membro opcional) sempre falha → 500 | Integridade de agendamento + 500 em fluxo normal | Sem validação de membership/location no handler; auto-assign exigia `endAt` exato, mas o slot é `+duration+buffer` |
| **P3** | Transições de status inválidas → **500** (12/12 observadas); `CONFIRMED→CANCELLED` dentro da janela → 500 | Erros de domínio viram `Internal Server Error` (semântica errada) | Erros de domínio são `Error` puro; **não existe exception filter** no código atual da branch |
| **P4** | `GET slots` retorna `[]` mesmo com working-hours 200 | Falso-positivo de "gerador quebrado" (não é bug) | **Pré-condição faltante**: vínculo `professional↔service` (`POST /services/{serviceId}/professionals`) + pedido pela location correta |

**Bônus (segurança):** o guard de autenticação imprimia no log o token e **todos os headers** da requisição (vazamento de credencial em logs). Logs de debug removidos.

**Esclarecimento — `CONFIRMED→CANCELLED`:** é **permitido pela regra existente** (o status CONFIRMED é aceito em `cancel()`). O 500 observado era a **janela de cancelamento** (`cancellationPolicyHours`, 24h na fixture) sem mapeamento de erro — não é bug de transição, é bug de semântica de erro (P3).

## 3. Correções implementadas (para referência do responsável)

- **P1** — Autorização: lista exige **dono/gerente** (owner `ownerUserId` ou membership ativa `OWNER|MANAGER`); por ID exige **cliente dono | profissional alocado | dono/gerente**. Negados → `403`; inexistente → `404`.
- **P2** — Create valida: location existe/ativa/do negócio (`404`); profissional **vinculado ao serviço na location ativa** (`409` `ProfessionalNotAvailableError` — cobre inexistente/inativo/outra location/outro negócio). Auto-assign usa o **`endAt` canônico do slot** (volta a funcionar).
- **P3** — 6 erros de domínio migrados para `DomainError` com status (`404/409/409/409/400/409`) + **exception filter global** (`DomainErrorFilter`) registrado no `main.ts`; erros não mapeados → `500` genérico; `HttpException` preservada (401/403/429/423 intactos).
- **P4** — Nenhuma alteração de código (comportamento correto); corrigida a **nota errada** em `docs/eob-validacao-booking.md`.

**Status:** 81 testes unit (13 suites) PASS · lint 0 · build 0. **Não commitado** (branch `rework`, árvore com modificações locais).

## 4. Pedido à EOB — artefatos em `.zip`

Solicitamos que EOB gere um arquivo **`artefatos-backend-agendaqui.zip`** contendo, no mínimo, os artefatos abaixo para o **responsável pelo backend**:

```
artefatos-backend-agendaqui/
├── README.md                      # índice + contexto (links para docs/eob-validacao-booking.md)
├── CR/                            # Change Requests — 1 por mudança (ver modelo §5)
│   ├── CR-001-autorizacao-listagens.md   (P1: GET businesses/{id}/appointments + GET appointments/{id})
│   ├── CR-002-validacao-create.md        (P2: membership/location + auto-assign canônico)
│   ├── CR-003-erros-status-4xx.md        (P3: DomainError + exception filter)
│   └── CR-004-logs-guard.md              (bônus: remoção de dump de headers/token)
├── ADD/                           # Architecture/Design Decisions (ver modelo §6)
│   ├── ADD-001-modelo-erros-api.md       (mapeamento domínio→HTTP, sem “tudo 400”)
│   ├── ADD-002-modelo-autorizacao.md     (papéis owner/manager/profissional/cliente)
│   └── ADD-003-regra-auto-atribuicao.md  (employeeMembershipId opcional; slot canônico)
├── EVIDENCIAS/                    # provas (sem credenciais)
│   ├── matriz-transicoes.md              (4 válidas / 12 inválidas, status esperado pós-fix)
│   ├── fixtures.md                       (IDs de business/location/membership/service de teste)
│   └── specs-api.md                      (contrato atual: create, slots, listagens)
└── TESTES/                        # relatório de execução
    ├── resultados-unit.md                (13 suites / 81 testes PASS)
    └── como-reproduzir.md                (env, pnpm via corepack, gate build/lint)
```

### 5. Modelo mínimo de CR (preencher 1 por mudança)

```
# CR-00X — <título>
Status: Proposto | Data: 
Endpoint/área afetada: 
Problema (antes): 
Comportamento esperado (depois): 
Código HTTP antes → depois: 
Riscos de regressão: 
Critérios de aceite (testes): 
Referência de código (handler/arquivo): 
```

### 6. Modelo mínimo de ADD (preencher 1 por decisão)

```
# ADD-00X — <título>
Problema/contexto: 
Decisão: 
Alternativas consideradas (e por que rejeitadas): 
Impacto (rotas, contratos, DTOs, testes): 
Mudanças necessárias no frontend (havendo): 
```

### 7. Checklist do responsável pelo backend

- [ ] Revisar e **commit/push** das mudanças na branch `rework` (`git status` para conferir árvore)
- [ ] Validar os 4 CR contra as evidências (matriz de transições, fixtures)
- [ ] **e2e** com DATABASE_URL + Redis reais (não executável localmente sem infra)
- [ ] Confirmar deploy (live hoje está à frente do branch — alinhar versões) e re-testar ao vivo: 403 em listagem externa, 409 no create inválido, 4xx nas transições
- [ ] Decidir pendências de produto (§8)

## 8. Pendências de produto (decisões do responsável/EOB)

1. `/me/agenda` (profissional) usa `user.id` como membership → retorna vazio; definir agenda por membership ativa do usuário no período.
2. Create com profissional explícito não valida horário dentro do working-hours/booking-window (só vínculo/conflito) — aceitar ou exigir passagem pela disponibilidade.
3. Janela de cancelamento (`cancellationPolicyHours`) aplicada a clientes e profissionais — validar semântica.

---

**Próximo passo:** EOB confirmar o aceite dos achados e disponibilizar o `.zip` com CR/ADD (e evidências) para o responsável pelo backend.
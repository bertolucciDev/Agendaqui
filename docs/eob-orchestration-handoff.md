# Handoff — EOB (Engenheiro de Orquestração) — Validação do Plano de Endpoints

> **De:** Agente de Análise (Frontend Agendaqui)
> **Para:** EOB — Engenheiro de Orquestração (Luis)
> **Objetivo:** Validar o plano corrigido de implementação dos endpoints antes de qualquer código.
> **Status:** ⏳ Aguardando validação e decisões do EOB.
> **Data:** 2026-09-21

---

## 1. Veredito da investigação anterior

O plano original (`docs/endpoints-implementation-plan.md`) foi analisado contra:

- OpenAPI ao vivo (`https://agendaqui-api.onrender.com/docs`)
- Comportamento real da API (requisições HTTP diretas)
- Código-fonte do frontend (services, páginas, tipos, rotas)

**Veredito geral: APROVADO COM CORREÇÕES.**

O ponto mais importante: **a premissa central do plano está incorreta**. O plano afirmava que ~33 endpoints "não são consumidos" e que seria necessário **criar** dezenas de métodos de serviço. Na realidade, **a quase totalidade dos métodos de serviço já existe** no frontend (`src/services/api/`). O trabalho real é de **UI/páginas**, além de correções estruturais que bloqueiam o funcionamento atual do app.

---

## 2. Fatos validaDOS (contratos confirmados contra o spec + API ao vivo)

### 2.1 Contagem de endpoints

| Métrica | Valor |
|---|---|
| Paths na OpenAPI | **53** |
| Operations (método × path) | **63** |
| Endpoints do plano que existem | **16 / 16** ✅ |

> O doc `api-endpoints.md` diz "53 endpoints" — esse número é a contagem de **paths**, não de operations.

### 2.2 Endpoints do plano que já existem no service layer do frontend

**Sem nenhuma alteração de serviço necessária (só falta UI):**

| Endpoint | Método já existente em `src/services/api/` |
|---|---|
| `GET /appointments/{id}` | `appointmentsApi.getById()` |
| `PATCH /appointments/{id}/confirm` | `appointmentsApi.confirm()` |
| `PATCH /appointments/{id}/cancel` | `appointmentsApi.cancel()` |
| `PATCH /appointments/{id}/complete` | `appointmentsApi.complete()` |
| `PATCH /appointments/{id}/no-show` | `appointmentsApi.noShow()` ⚠️ bug |
| `GET /me/appointments` | `appointmentsApi.listMy()` |
| `GET /me/agenda` | `appointmentsApi.getMyAgenda()` |
| `PUT /employees/{employeeMembershipId}` | `staffApi.updateEmployee()` |
| `DELETE /employees/{employeeMembershipId}` | `staffApi.removeEmployee()` |
| `PUT /employees/{id}/working-hours` | `staffApi.setWorkingHours()` |
| `POST /employees/{id}/time-offs` | `staffApi.requestTimeOff()` |
| `PUT /time-offs/{id}/approve` | `staffApi.approveTimeOff()` |
| `PUT /time-offs/{id}/reject` | `staffApi.rejectTimeOff()` |
| `POST /services/{serviceId}/professionals` | `staffApi.assignProfessional()` |
| `DELETE /services/{serviceId}/professionals` | `staffApi.unassignProfessional()` |

**ÚNICOS métodos que realmente precisam ser criados:**
- `businessesApi.getLocationsBySlug()` → `GET /businesses/{slug}/locations`
- `businessesApi.getProfessionalsBySlug()` → `GET /businesses/{slug}/professionals`
- `locationsApi.getById()` → `GET /locations/{id}`
- `locationsApi.getHeadquarter()` → `GET /locations/business/{businessId}/headquarter`

---

## 3. Problemas estruturais que BLOQUEIAM o app (devem ser resolvidos antes/na Fase 0)

| # | Problema | Evidência | Impacto |
|---|---|---|---|
| P1 | `GET /businesses` (listagem) **não existe** | 404 ao vivo (`{"message":"Cannot GET /businesses"}`); ausente no spec | Todas as páginas (dashboard, businesses, staff, locations, services, appointments) usam `businessesApi.list()` e dependem dele para obter `businessId` → **app não lista dados hoje** |
| P2 | Listagem de equipe **não existe** | `GET /businesses/{businessId}/employees` e `GET /locations/{locationId}/employees` → 404 ao vivo | Página de Equipe (`staff.tsx`) não carrega dados |
| P3 | Booking envia `locationId: business.id` | `booking/index.tsx` usa o id do negócio como `locationId` (deveria ser UUID de um Location) | Slots e criação de agendamento com unidade errada |
| P4 | `POST /businesses/{businessId}/appointments` **exige autenticação** | 401 ao vivo sem bearer (`{"statusCode":401,"message":"Autenticação necessária."}`) | Página pública `/book/:slug` não pode agendar sem login |
| P5 | `noShow()` não envia corpo | `CompleteAppointmentDto` exige `employeeMembershipId` (REQ) | 400 garantido ao acionar pela UI |
| P6 | Rotas órfãs | `/appointments/new` não tem página (rota `/appointments/*` cai no calendário); botão "Novo local" aponta para rota removida | UX regressiva; confusão de navegação |

---

## 4. Divergências SPEC × API AO VIVO (crítico para decidir contratos)

| Endpoint | O que o SPEC diz | O que a API AO VIVO faz |
|---|---|---|
| `GET /locations`, `GET /locations/{id}`, `GET /locations/business/.../locations`, `GET /locations/business/.../headquarter` | Público (sem auth) | **401 sem bearer** (autenticado) |
| `GET /categories/{id}` | Público | 401 sem bearer |
| `GET /businesses/{businessId}/appointments` | Público (sem auth) | **401 sem bearer** |
| `GET /businesses/{slug}/locations` | Query `page`/`limit` | **Rejeita page/limit** (400); funciona **sem params** → retorna `{"data":[]}` |
| `GET /businesses/{slug}/professionals` | Requer `serviceId` (REQ) | **Rejeita TODOS os query params** (400 "should not exist") |

> ⚠️ **Conclusão:** as anotações de `security` e os parâmetros do spec **não são confiáveis** para os endpoints de locais/categorias/booking. Implementar confiando apenas no spec gerará 400/401.

---

## 5. Aspectos NÃO documentados (dependem de teste com token real)

| Item | Estado | O que falta confirmar |
|---|---|---|
| Máquina de estados do Appointment | HIPÓTESE | Se `PENDING→Confirmar/Cancelar` e `CONFIRMED→Concluir/Não compareceu` estão corretos; se cancel é permitido depois de CONFIRMED |
| `TimeOff.status` (PENDING/APPROVED/REJECTED) | HIPÓTESE | Modelo real da response |
| Response/erro de TODOS os endpoints | NÃO DOCUMENTADO | Spec não define nenhum `response` body |
| Paginação real (`me/appointments`, `slots`) | DESCONHECIDO | Formato exato (objeto paginado vs array) |
| Profissionais por serviço (contrato real) | DESCONHECIDO | Como o deploy real espera filtrar profissionais |
| Política de cancelamento do cliente | DESCONHECIDO | Janela/permissões reais |
| Fonte de listagem de negócios (`GET /businesses`) | DESCONHECIDO | Qual endpoint substitui o 404 |

---

## 6. PLANO CORRIGIDO (proposta para validação do EOB)

### Fase 0 — Fundação (BLOQUEIA TODAS AS OUTRAS) ⛔
- [ ] Resolver fonte de listagem de negócios (P1)
- [ ] Resolver listagem de equipe (P2)
- [ ] Corrigir `locationId` no booking (P3)
- [ ] Decidir política de auth no booking — login obrigatório vs anônimo (P4)
- [ ] Corrigir `noShow()` — adicionar `employeeMembershipId` (P5)
- [ ] Limpar rotas órfãs `/appointments/new` e botão "Novo local" (P6)

### Fase 1 — Appointments: ações de estado (UI)
- [ ] Botões no modal de detalhes conforme status (confirmar/cancelar/concluir/não compareceu)
- [ ] Modal de cancelamento com motivo (`reason`)
- [ ] Compor `employeeMembershipId` a partir dos memberships do usuário logado
- **Serviços:** já existem ✅

### Fase 2 — Meus agendamentos (cliente) — nova página
- [ ] Página `me-appointments`
- [ ] Rota + item de menu ("Meus Agendamentos")
- **Serviço:** `listMy()` já existe ✅

### Fase 3 — Staff: gestão completa (UI)
- [ ] Resolver listagem de equipe (Fase 0) antes
- [ ] Dropdown: Editar / Remover / Horários / Férias
- [ ] Página de horários semanais (converter hora → `startMinute`/`endMinute`)
- [ ] Página de afastamentos + aprovar/rejeitar (dono/gerente)
- **Serviços:** já existem ✅

### Fase 4 — Booking: unidade e profissional
- [ ] Step de unidade via `GET /businesses/{slug}/locations` (**sem** `page`/`limit`)
- [ ] Resolver contrato real de `professionals` (com token)
- [ ] Incluir `professionalId` no slots e `employeeMembershipId` no create
- **Novos serviços:** `getLocationsBySlug`, `getProfessionalsBySlug`

### Fase 5 — Locations & Dashboard
- [ ] Modal de detalhes do local (`getById`)
- [ ] Card "Sede Principal" (`getHeadquarter`)
- [ ] Requerem autenticação (usar client autenticado)
- **Novos serviços:** `getById`, `getHeadquarter`

---

## 7. DECISÕES QUE O EOB PRECISA TOMAR ANTES DE APROVAR

1. **Listagem de negócios (P1):** qual é o contrato oficial para listar os negócios do usuário autenticado? Se não houver, autorizar troca de fonte (ex.: derivar de memberships/locais).
2. **Listagem de equipe (P2):** o deploy correto usa `GET /businesses/{slug}/professionals`? Com qual payload de filtro (já que `serviceId` é rejeitado ao vivo)?
3. **Auth no booking (P4):** autorizar exigir login para agendar OU criar fluxo anônimo seguro?
4. **Máquina de estados dos agendamentos:** fornecer a matriz autorizada de transições (quem pode → de qual status → para qual).
5. **Token real de teste:** EOB deve fornecer credenciais/token de um usuário com negócio criado para validar os "DESCONHECIDO".
6. **Estimativa:** ~17–24h é plausível no limite superior SE incluir Fase 0 + QA + regressões; sem Fase 0, o escopo "UI only" é ~8–12h.

---

## 8. Ordem sugerida de ações do EOB (para destravar)

1. Validar contratos autenticados (itens da seção 5) com token real → preencher DESCONHECIDO/HIPÓTESE.
2. Decidir itens 1–4 da seção 7.
3. Aprovar a Fase 0 (fundação) como pré-requisito.
4. Liberar Fases 1-5 na ordem acima (Fase 0 → 1 → 2 → 3 → 4 → 5).
5. Após aprovação, o agente de build executa; cada fase termina com build + TS check.

---

## 9. JSON de return (para orquestração)

```json
{
  "document": "docs/eob-orchestration-handoff.md",
  "planBeingValidated": "docs/endpoints-implementation-plan.md",
  "verdict": "approved-with-corrections",
  "criticalFindings": {
    "serviceMethodsAlreadyExist": true,
    "businessListEndpointMissing": "GET /businesses returns 404",
    "staffListEndpointMissing": "GET /businesses/{id}/employees and /locations/{id}/employees return 404",
    "bookingLocationIdBug": "uses business.id instead of location UUID",
    "bookingCreateRequiresAuth": "POST /businesses/{id}/appointments returns 401 without bearer",
    "specVsLiveDivergence": ["locations list/detail auth", "professionals query params", "public locations pagination"]
  },
  "endpointsToCreateInFrontend": [
    "businessesApi.getLocationsBySlug",
    "businessesApi.getProfessionalsBySlug",
    "locationsApi.getById",
    "locationsApi.getHeadquarter"
  ],
  "phases": {
    "phase0": "foundation - REQUIRED to unblock",
    "phase1": "appointments UI actions",
    "phase2": "my-appointments page",
    "phase3": "staff full management UI",
    "phase4": "booking location+professional",
    "phase5": "locations detail + dashboard headquarter"
  },
  "blockers": [
    "business list source decision",
    "staff list source decision",
    "booking auth policy",
    "appointment state machine matrix",
    "real auth token for contract validation"
  ],
  "status": "awaiting-eob-decisions"
}
```
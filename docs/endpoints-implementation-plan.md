# Plano de Implementação — Endpoints Não Utilizados no Frontend

> **Status:** Aguardando aprovação
> **Total de endpoints na API:** 53
> **Endpoints utilizados no frontend:** ~20 (~38%)
> **Endpoints não utilizados:** 33 (~62%)

---

## 1. Contexto e Objetivo

A matriz `api-frontend-map.md` mostra que o frontend consome apenas ~38% dos endpoints
disponíveis. Os demais endpoints habilitam funcionalidades importantes que hoje não
existem no app:

- Gestão de estado de agendamentos (confirmar/cancelar/concluir/não-comparecimento)
- Cliente visualizar os próprios agendamentos
- Gestão completa de funcionários (editar, remover, horários de trabalho, férias)
- Booking público com seleção de unidade e profissional
- Detalhes de locais e sede principal do negócio

Este documento descreve, por fase, **o que** será implementado e **por quê**.

---

## 2. Fase 1 — Appointments: Ações de Estado

### 2.1 Por que implementar?

Hoje o profissional/dono do negócio **só consegue visualizar** os agendamentos.
Não há como confirmar, cancelar, concluir ou registrar não-comparecimento, o que
quebra o fluxo operacional completo (agendamento → confirmação → atendimento → fechamento).

### 2.2 Endpoints

| Método | Endpoint | Regra de negócio |
|--------|----------|------------------|
| `GET` | `/appointments/{id}` | Buscar detalhes frescos de um agendamento |
| `PATCH` | `/appointments/{id}/confirm` | Profissional confirma o agendamento |
| `PATCH` | `/appointments/{id}/cancel` | Cliente ou profissional cancelam (com motivo) |
| `PATCH` | `/appointments/{id}/complete` | Profissional marca como concluído |
| `PATCH` | `/appointments/{id}/no-show` | Profissional marca não-comparecimento |

### 2.3 Alterações no frontend

- `src/services/api/appointments.ts` — adicionar métodos:
  `getById`, `confirm`, `cancel`, `complete`, `noShow`
- `src/pages/appointments.tsx` — modal de detalhes com **botões condicionais por status**:

  - `PENDING` → Confirmar / Cancelar
  - `CONFIRMED` → Concluir / Não compareceu
  - Cancelar abre modal com motivo (`cancelReason`)
- `src/types/index.ts` — adicionar `cancelReason?: string` em `Appointment`

### 2.4 Novos arquivos

- `src/components/appointments/appointment-actions.tsx` — barra de ações do modal
- `src/components/appointments/cancel-modal.tsx` — modal de cancelamento com motivo

**Esforço:** 4–6h

---

## 3. Fase 2 — Meus Agendamentos (Cliente)

### 3.1 Por que implementar?

O cliente logado agenda horários, mas **não tem nenhuma tela** para ver/gerenciar
seus próprios agendamentos. Isso quebra a experiência do cliente: ele agenda mas
não consegue acompanhar confirmação nem cancelar.

### 3.2 Endpoint

| Método | Endpoint | Regra de negócio |
|--------|----------|------------------|
| `GET` | `/me/appointments` | Lista agendamentos do usuário autenticado como cliente |

### 3.3 Alterações no frontend

- `src/services/api/appointments.ts` — adicionar `listMine()`
- `src/App.tsx` — adicionar rota `/me/appointments`
- `src/components/layout/dashboard-layout.tsx` — item de menu "Meus Agendamentos"

### 3.4 Novo arquivo

- `src/pages/me/appointments.tsx` — lista agrupada por data, com status via badge
  e botão "Cancelar" para agendamentos `PENDING`/`CONFIRMED`

**Esforço:** 2–3h

---

## 4. Fase 3 — Staff: Gestão Completa

### 4.1 Por que implementar?

A página de funcionários hoje **só permite convidar** por e-mail. Não existe como:

- Editar cargo ou desativar um funcionário
- Definir os horários de trabalho semanais
- Gerenciar férias/ausências (solicitar, aprovar, rejeitar)

Sem isso, o dono não consegue operar a agenda nem controlar a equipe.

### 4.2 Endpoints

| Método | Endpoint | Regra de negócio |
|--------|----------|------------------|
| `PUT` | `/employees/{id}` | Atualizar cargo/ativação |
| `DELETE` | `/employees/{id}` | Demitir/remover (soft delete) |
| `PUT` | `/employees/{id}/working-hours` | Definir grade semanal de trabalho |
| `POST` | `/employees/{id}/time-offs` | Solicitar afastamento (férias/licença) |
| `PUT` | `/time-offs/{id}/approve` | Aprovar solicitação |
| `PUT` | `/time-offs/{id}/reject` | Rejeitar solicitação |

### 4.3 Alterações no frontend

- `src/services/api/staff.ts` — adicionar:
  `update`, `delete`, `setWorkingHours`, `createTimeOff`, `approveTimeOff`, `rejectTimeOff`
- `src/pages/staff.tsx` — dropdown por funcionário com:
  Editar / Horários / Férias / Remover
- `src/App.tsx` — novas rotas `/staff/:id/working-hours` e `/staff/:id/time-off`
- `src/types/index.ts` — tipos `WorkingHours`, `TimeOff`
- `src/lib/validations.ts` — schemas `workingHoursSchema`, `timeOffSchema`

### 4.4 Novos arquivos

- `src/pages/staff/working-hours.tsx` — grade com os 7 dias da semana
  (ligado/desligado, hora início, hora fim)
- `src/pages/staff/time-off.tsx` — formulário de solicitação + lista de solicitações
  pendentes com botões Aprovar/Rejeitar (para dono/gerente)

**Esforço:** 6–8h

---

## 5. Fase 4 — Booking Público: Unidade e Profissional

### 5.1 Por que implementar?

O booking público é a porta de entrada do cliente. Hoje o fluxo é
serviço → data/hora → confirmar. Não há **seleção de unidade** (negócios podem ter
múltiplas filiais) nem **escolha de profissional**. Isso limita negócios com mais de
uma unidade e impede o cliente de preferir um profissional específico.

### 5.2 Endpoints

| Método | Endpoint | Regra de negócio |
|--------|----------|------------------|
| `GET` | `/businesses/{slug}/locations` | Listar unidades públicas do negócio |
| `GET` | `/businesses/{slug}/professionals` | Listar profissionais públicos |

### 5.3 Alterações no frontend

- `src/services/api/businesses.ts` — adicionar `getLocationsBySlug`, `getProfessionalsBySlug`
- `src/services/api/appointments.ts` — `create` passa a aceitar
  `locationId` e `employeeMembershipId`
- `src/pages/booking/index.tsx` — novos passos no fluxo:

  1. Escolher **unidade** (primeira opção)
  2. Escolher serviço (existente)
  3. Escolher **profissional** (opcional, com opção "Sem preferência") (novo)
  4. Escolher data/hora (existente)
  5. Confirmar (existente)

**Esforço:** 3–4h

---

## 6. Fase 5 — Locations e Dashboard

### 6.1 Por que implementar?

- `locations.tsx` lista locais mas não exibe **detalhes** nem feriados ao clicar.
- `dashboard.tsx` não informa a **sede principal** do negócio.

### 6.2 Endpoints

| Método | Endpoint | Regra de negócio |
|--------|----------|------------------|
| `GET` | `/locations/{id}` | Buscar detalhes do local |
| `GET` | `/locations/business/{businessId}/headquarter` | Buscar sede do negócio |

### 6.3 Alterações no frontend

- `src/services/api/locations.ts` — adicionar `getById`, `getHeadquarter`
- `src/pages/locations.tsx` — modal de detalhes ao clicar no card
- `src/pages/dashboard.tsx` — card "Sede Principal" com nome e endereço

**Esforço:** 2–3h

---

## 7. Resumo de Arquivos

### Novos (5)

| Arquivo | Propósito |
|---------|-----------|
| `src/pages/me/appointments.tsx` | Cliente vê seus agendamentos |
| `src/pages/staff/working-hours.tsx` | Grade semanal de horários |
| `src/pages/staff/time-off.tsx` | Solicitar/aprovar férias |
| `src/components/appointments/appointment-actions.tsx` | Ações de status no modal |
| `src/components/appointments/cancel-modal.tsx` | Cancelamento com motivo |

### Alterados (13)

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/appointments.tsx` | Ações de status + GET by id |
| `src/pages/staff.tsx` | Dropdown com editar/remover/horários/férias |
| `src/pages/booking/index.tsx` | Steps de unidade e profissional |
| `src/pages/locations.tsx` | Modal de detalhes |
| `src/pages/dashboard.tsx` | Card sede principal |
| `src/services/api/appointments.ts` | +6 métodos |
| `src/services/api/staff.ts` | +6 métodos |
| `src/services/api/locations.ts` | +2 métodos |
| `src/services/api/businesses.ts` | +2 métodos |
| `src/App.tsx` | +3 rotas |
| `src/components/layout/dashboard-layout.tsx` | +1 item de menu |
| `src/types/index.ts` | +`WorkingHours`, `TimeOff`, `cancelReason` |
| `src/lib/validations.ts` | +`workingHoursSchema`, `timeOffSchema` |

---

## 8. Ordem de Execução e Esforço

| Fase | Descrição | Endpoints | Esforço |
|------|-----------|-----------|---------|
| 1 | Appointments — ações de estado | 5 | 4–6h |
| 2 | Meus agendamentos (cliente) | 1 | 2–3h |
| 3 | Staff — gestão completa | 6 | 6–8h |
| 4 | Booking — unidade e profissional | 2 | 3–4h |
| 5 | Locations e dashboard | 2 | 2–3h |
| | **Total** | **16** | **17–24h** |

---

## 9. Return para Orquestração (ChatGPT)

```json
{
  "plan": "implement-new-endpoints",
  "version": "1.0",
  "totalEndpoints": 53,
  "usedEndpoints": 20,
  "unusedEndpoints": 33,
  "implementationPhases": [
    {
      "phase": 1,
      "name": "appointments-actions",
      "endpoints": [
        "PATCH /appointments/{id}/confirm",
        "PATCH /appointments/{id}/cancel",
        "PATCH /appointments/{id}/complete",
        "PATCH /appointments/{id}/no-show",
        "GET /appointments/{id}"
      ],
      "filesToCreate": [
        "src/components/appointments/appointment-actions.tsx",
        "src/components/appointments/cancel-modal.tsx"
      ],
      "filesToUpdate": [
        "src/pages/appointments.tsx",
        "src/services/api/appointments.ts",
        "src/types/index.ts"
      ],
      "effort": "4-6h"
    },
    {
      "phase": 2,
      "name": "my-appointments",
      "endpoints": ["GET /me/appointments"],
      "filesToCreate": ["src/pages/me/appointments.tsx"],
      "filesToUpdate": [
        "src/App.tsx",
        "src/services/api/appointments.ts",
        "src/components/layout/dashboard-layout.tsx"
      ],
      "effort": "2-3h"
    },
    {
      "phase": 3,
      "name": "staff-full-management",
      "endpoints": [
        "PUT /employees/{id}",
        "DELETE /employees/{id}",
        "PUT /employees/{id}/working-hours",
        "POST /employees/{id}/time-offs",
        "PUT /time-offs/{id}/approve",
        "PUT /time-offs/{id}/reject"
      ],
      "filesToCreate": [
        "src/pages/staff/working-hours.tsx",
        "src/pages/staff/time-off.tsx"
      ],
      "filesToUpdate": [
        "src/pages/staff.tsx",
        "src/App.tsx",
        "src/services/api/staff.ts",
        "src/types/index.ts",
        "src/lib/validations.ts"
      ],
      "effort": "6-8h"
    },
    {
      "phase": 4,
      "name": "booking-enhanced",
      "endpoints": [
        "GET /businesses/{slug}/locations",
        "GET /businesses/{slug}/professionals"
      ],
      "filesToCreate": [],
      "filesToUpdate": [
        "src/pages/booking/index.tsx",
        "src/services/api/businesses.ts",
        "src/services/api/appointments.ts"
      ],
      "effort": "3-4h"
    },
    {
      "phase": 5,
      "name": "locations-dashboard",
      "endpoints": [
        "GET /locations/{id}",
        "GET /locations/business/{businessId}/headquarter"
      ],
      "filesToCreate": [],
      "filesToUpdate": [
        "src/pages/locations.tsx",
        "src/pages/dashboard.tsx",
        "src/services/api/locations.ts"
      ],
      "effort": "2-3h"
    }
  ],
  "totalEffort": "17-24h",
  "status": "awaiting-approval"
}
```
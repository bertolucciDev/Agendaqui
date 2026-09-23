# Inventário Oficial de Endpoints — Agendaqui API

> Base URL: `https://agendaqui-api.onrender.com/`
> Especificação: OpenAPI 3.0.0 (NestJS + Fastify)
> Total de endpoints: 53

---

## app

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-001 | GET | `/` | app | Não | — | `{ status, message, documentation }` | Verifica se a API está online |

---

## auth

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-002 | POST | `/auth/login` | auth | Não | `LoginDto` | tokens + user | Autenticar com e-mail e senha |
| API-003 | POST | `/auth/refresh-token` | auth | Não | `RefreshTokenDto` | novos tokens | Renovar tokens de acesso |
| API-004 | POST | `/auth/logout` | auth | Bearer | — | 204 | Encerrar a sessão atual |
| API-005 | POST | `/auth/logout-all` | auth | Bearer | — | 204 | Encerrar todas as sessões do usuário |
| API-006 | POST | `/auth/forgot-password` | auth | Não | `ForgotPasswordDto` | 201 | Solicitar redefinição de senha |
| API-007 | POST | `/auth/reset-password` | auth | Não | `ResetPasswordDto` | 201 | Redefinir senha com código |
| API-008 | POST | `/auth/verify-email` | auth | Não | `VerifyEmailDto` | 201 | Confirmar e-mail com código |
| API-009 | POST | `/auth/first-access/set-password` | auth | Bearer | `SetInitialPasswordDto` | 201 | Definir senha no primeiro acesso |
| API-010 | POST | `/auth/create-temp-session` | auth | Bearer | — | 201 | Trocar token temporário por sessão completa |
| API-011 | GET | `/auth/me` | auth | Bearer | — | user profile | Buscar dados do usuário autenticado |
| API-012 | POST | `/auth/accept-invite` | auth | Não | `AcceptMembershipInviteDto` | 201 | Aceitar convite de trabalho |

---

## users

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-013 | POST | `/users` | users | Não | `CreateUserDto` | 201 | Registrar novo usuário |
| API-014 | GET | `/users/{id}` | users | Bearer | — | user profile | Buscar perfil de usuário por ID |

---

## categories

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-015 | POST | `/categories` | categories | Bearer (admin) | `CreateCategoryDto` | 201 | Criar categoria (somente admin) |
| API-016 | GET | `/categories` | categories | Não | — | category tree | Listar categorias em árvore |
| API-017 | DELETE | `/categories/{id}` | categories | Bearer (admin) | — | 200 | Remover categoria (soft delete, admin) |

---

## businesses

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-018 | POST | `/businesses` | businesses | Bearer | `CreateBusinessDto` | 201 | Criar negócio (+ local + OWNER) |
| API-019 | PUT | `/businesses/{id}` | businesses | Bearer (dono) | `UpdateBusinessDto` | 200 | Atualizar perfil do negócio |
| API-020 | DELETE | `/businesses/{id}` | businesses | Bearer (dono) | — | 200 | Remover negócio (soft delete) |
| API-021 | GET | `/businesses/{slug}` | businesses | Não | — | business public | Buscar negócio público pelo slug |
| API-022 | GET | `/businesses/{slug}/services` | businesses | Não | query: page, limit | services list | Listar serviços públicos por slug |

---

## locations

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-023 | POST | `/businesses/{businessId}/locations` | locations | Bearer | `CreateLocationDto` | 201 | Criar local (unidade) |
| API-024 | PUT | `/locations/{id}` | locations | Bearer (dono/gerente) | `UpdateLocationDto` | 200 | Atualizar local |
| API-025 | DELETE | `/locations/{id}` | locations | Bearer (dono/gerente) | — | 200 | Remover local (soft delete) |
| API-026 | POST | `/locations/{id}/holidays` | locations | Bearer | `CreateHolidayDto` | 201 | Criar feriado/fechamento |
| API-027 | DELETE | `/holidays/{id}` | locations | Bearer | — | 200 | Remover feriado |

---

## services

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-028 | POST | `/businesses/{businessId}/services` | services | Bearer (dono) | `CreateServiceDto` | 201 | Criar serviço |
| API-029 | PUT | `/services/{id}` | services | Bearer (dono) | `UpdateServiceDto` | 200 | Atualizar serviço |
| API-030 | DELETE | `/services/{id}` | services | Bearer (dono) | — | 200 | Remover serviço (soft delete) |

---

## staff

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-031 | POST | `/locations/{locationId}/employees` | staff | Bearer (dono) | `CreateMembershipDto` | 201 | Vincular funcionário a local |
| API-032 | PUT | `/employees/{employeeMembershipId}` | staff | Bearer (dono) | `UpdateMembershipDto` | 200 | Atualizar vínculo (cargo/ativação) |
| API-033 | PUT | `/employees/{employeeMembershipId}/working-hours` | staff | Bearer | `UpsertWorkingHoursDto` | 200 | Definir horários de trabalho |
| API-034 | POST | `/employees/{employeeMembershipId}/time-offs` | staff | Bearer | `RequestTimeOffDto` | 201 | Solicitar afastamento |
| API-035 | PUT | `/time-offs/{id}/approve` | staff | Bearer (dono/gerente) | — | 200 | Aprovar afastamento |
| API-036 | PUT | `/time-offs/{id}/reject` | staff | Bearer (dono/gerente) | — | 200 | Rejeitar afastamento |
| API-037 | POST | `/services/{serviceId}/professionals` | staff | Bearer | query: employeeMembershipId | 201 | Atribuir profissional a serviço |
| API-038 | DELETE | `/services/{serviceId}/professionals` | staff | Bearer | query: employeeMembershipId | 200 | Remover profissional de serviço |
| API-039 | POST | `/businesses/{businessId}/invites` | staff | Bearer (dono) | `CreateMembershipInviteDto` | 201 | Convidar funcionário por e-mail |

---

## employees

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-040 | DELETE | `/employees/{employeeMembershipId}` | employees | Bearer (dono) | — | 200 | Demitir/remover funcionário (OWNER não pode) |

---

## appointments

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-041 | POST | `/businesses/{businessId}/appointments` | appointments | Bearer | `CreateAppointmentDto` | 201 | Agendar horário (cliente) |
| API-042 | GET | `/businesses/{businessId}/appointments` | appointments | Bearer (dono/gerente) | query: status, dateFrom, dateTo, limit, offset | appointments list | Listar agendamentos do negócio |
| API-043 | PATCH | `/appointments/{id}/confirm` | appointments | Bearer (profissional) | `ConfirmAppointmentDto` | 200 | Confirmar agendamento |
| API-044 | PATCH | `/appointments/{id}/cancel` | appointments | Bearer | `CancelAppointmentDto` | 200 | Cancelar agendamento |
| API-045 | PATCH | `/appointments/{id}/complete` | appointments | Bearer (profissional) | `CompleteAppointmentDto` | 200 | Marcar como concluído |
| API-046 | PATCH | `/appointments/{id}/no-show` | appointments | Bearer (profissional) | — | 200 | Marcar não comparecimento |
| API-047 | GET | `/businesses/{businessId}/slots` | appointments | Bearer | query: serviceId, dateFrom, dateTo, professionalId, locationId | slots list | Listar slots disponíveis |
| API-048 | GET | `/me/appointments` | appointments | Bearer | query: status, dateFrom, dateTo, limit, offset | appointments list | Listar meus agendamentos (cliente) |
| API-049 | GET | `/me/agenda` | appointments | Bearer | query: dateFrom, dateTo | agenda list | Ver minha agenda como profissional |
| API-050 | GET | `/appointments/{id}` | appointments | Bearer | — | appointment | Buscar agendamento por ID |

---

## me

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-051 | GET | `/me/customer-profile` | me | Bearer | — | customer profile | Buscar perfil de cliente (reputação/strikes) |
| API-052 | GET | `/me/admin-profile` | me | Bearer | — | admin profile | Buscar perfil de administrador |

---

## platform-config

| ID | Método | Endpoint | Grupo | Auth | Request | Response | Descrição |
|----|--------|----------|-------|------|---------|----------|-----------|
| API-053 | GET | `/platform-config` | platform-config | Bearer | — | config | Buscar configuração global |
| API-054 | PUT | `/platform-config` | platform-config | Bearer (admin) | `UpdatePlatformConfigDto` | 200 | Atualizar taxa de comissão |

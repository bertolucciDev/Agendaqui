# Contrato Oficial da API — Agendaqui

## 1. Base URL

```
https://agendaqui-api.onrender.com/
```

## 2. Documentação

```
https://agendaqui-api.onrender.com/docs
```

Especificação: OpenAPI 3.0.0 (NestJS + Fastify + Scalar)

## 3. Autenticação

**Mecanismo:** HTTP Bearer Token (JWT)

```
Authorization: Bearer <jwt_token>
```

**Fluxo:**
1. Login → retorna `accessToken` + `refreshToken`
2. Usar `accessToken` em requests autenticados
3. Quando expirado, usar `refreshToken` para renovar
4. Logout invalida a sessão

**Endpoints públicos (sem auth):**
- `GET /`
- `POST /auth/login`
- `POST /auth/refresh-token`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-email`
- `POST /auth/accept-invite`
- `POST /users`
- `GET /categories`
- `GET /businesses/{slug}`
- `GET /businesses/{slug}/services`

## 4. Content-Type

```
Content-Type: application/json
```

## 5. Enums

| Enum | Valores |
|------|---------|
| BusinessType | `COMPANY`, `INDIVIDUAL` |
| AttendanceType | `AT_LOCATION`, `AT_CUSTOMER`, `BOTH` |
| MembershipRole | `OWNER`, `MANAGER`, `EMPLOYEE` |
| MembershipInviteRole | `MANAGER`, `EMPLOYEE` |
| DayOfWeek | `SUNDAY`, `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY` |
| TimeOffType | `VACATION`, `SICK_LEAVE`, `ABSENCE` |
| AppointmentStatus | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW` |

## 6. Paginação

**Mecanismo:** `limit` + `offset` (query params)

**Endpoints com paginação:**
- `GET /businesses/{slug}/services` — `page`, `limit`
- `GET /businesses/{businessId}/appointments` — `limit`, `offset`
- `GET /me/appointments` — `limit`, `offset`

**Formato da resposta (presumido):**
```json
{
  "data": [...],
  "total": 100,
  "limit": 10,
  "offset": 0
}
```

## 7. Filtros

**Appointments:**
- `status` — enum AppointmentStatus
- `dateFrom` — string (ISO 8601)
- `dateTo` — string (ISO 8601)

**Slots:**
- `serviceId` — string (required)
- `dateFrom` — string (required, ISO 8601)
- `dateTo` — string (required, ISO 8601)
- `professionalId` — string (optional)
- `locationId` — string (required)

## 8. Datas

**Formato:** ISO 8601 (`2026-08-20T10:00:00.000Z`)

**Exceção:** `CreateHolidayDto.date` usa `YYYY-MM-DD`

**Timezone:** Configurado por local (`America/Sao_Paulo`)

## 9. Preços

**Formato:** Centavos (integer). Ex: `2490` = R$ 24,90

## 10. Horários de Trabalho

**Formato:** Minutos desde meia-noite. Ex: `540` = 09:00, `1080` = 18:00

## 11. Soft Delete

A maioria dos endpoints de DELETE utiliza soft delete (marca como removido, não exclui fisicamente).

## 12. Erros

**Formato esperado:**
```json
{
  "statusCode": 400,
  "message": "Erro descritivo",
  "error": "Bad Request"
}
```

**Códigos possíveis:** 400, 401, 403, 404, 409, 422, 429, 500

## 13. Endpoints por Tag

### app (1)
- `GET /` — Health check

### auth (11)
- `POST /auth/login`
- `POST /auth/refresh-token`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-email`
- `POST /auth/first-access/set-password`
- `POST /auth/create-temp-session`
- `GET /auth/me`
- `POST /auth/accept-invite`

### users (2)
- `POST /users`
- `GET /users/{id}`

### categories (3)
- `POST /categories`
- `GET /categories`
- `DELETE /categories/{id}`

### businesses (5)
- `POST /businesses`
- `PUT /businesses/{id}`
- `DELETE /businesses/{id}`
- `GET /businesses/{slug}`
- `GET /businesses/{slug}/services`

### locations (5)
- `POST /businesses/{businessId}/locations`
- `PUT /locations/{id}`
- `DELETE /locations/{id}`
- `POST /locations/{id}/holidays`
- `DELETE /holidays/{id}`

### services (3)
- `POST /businesses/{businessId}/services`
- `PUT /services/{id}`
- `DELETE /services/{id}`

### staff (9)
- `POST /locations/{locationId}/employees`
- `PUT /employees/{employeeMembershipId}`
- `DELETE /employees/{employeeMembershipId}`
- `PUT /employees/{employeeMembershipId}/working-hours`
- `POST /employees/{employeeMembershipId}/time-offs`
- `PUT /time-offs/{id}/approve`
- `PUT /time-offs/{id}/reject`
- `POST /services/{serviceId}/professionals`
- `DELETE /services/{serviceId}/professionals`

### invites (1)
- `POST /businesses/{businessId}/invites`

### appointments (10)
- `POST /businesses/{businessId}/appointments`
- `GET /businesses/{businessId}/appointments`
- `PATCH /appointments/{id}/confirm`
- `PATCH /appointments/{id}/cancel`
- `PATCH /appointments/{id}/complete`
- `PATCH /appointments/{id}/no-show`
- `GET /businesses/{businessId}/slots`
- `GET /me/appointments`
- `GET /me/agenda`
- `GET /appointments/{id}`

### me (2)
- `GET /me/customer-profile`
- `GET /me/admin-profile`

### platform-config (2)
- `GET /platform-config`
- `PUT /platform-config`

## 14. Schemas

### LoginDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| email | string | Sim | E-mail do usuário |
| password | string | Sim | Senha do usuário |
| deviceInfo | string | Não | Info do dispositivo |

### RefreshTokenDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| refreshToken | string | Sim | JWT refresh token |

### ForgotPasswordDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| email | string | Sim | E-mail cadastrado |

### ResetPasswordDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| email | string | Sim | E-mail cadastrado |
| code | string | Sim | Código de verificação |
| newPassword | string | Sim | Nova senha (min 8, letras+números) |

### VerifyEmailDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| email | string | Sim | E-mail cadastrado |
| code | string | Sim | Código de verificação |

### SetInitialPasswordDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| newPassword | string | Sim | Senha inicial |

### CreateCategoryDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| name | string | Sim | Nome da categoria |
| slug | string | Sim | Slug da categoria |
| parentId | string/null | Não | Categoria pai |

### CreateBusinessDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| name | string | Sim | Nome do negócio |
| document | string | Sim | CPF/CNPJ (só dígitos) |
| type | enum | Sim | COMPANY ou INDIVIDUAL |
| categoryId | string | Sim | ID da categoria |
| locationName | string | Sim | Nome do primeiro local |
| address | string | Sim | Endereço do primeiro local |
| timezone | string | Sim | Timezone IANA |
| latitude | number | Não | Latitude |
| longitude | number | Não | Longitude |
| attendanceType | enum | Não | AT_LOCATION, AT_CUSTOMER, BOTH |
| phone | string | Não | Telefone |
| description | string | Não | Descrição |

### UpdateBusinessDto (todos opcionais)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| name | string | Novo nome |
| description | string/null | Nova descrição |
| categoryId | string | Nova categoria |
| sellsProducts | boolean | Vende produtos |
| cancellationPolicyHours | number | Janela de cancelamento (horas) |

### CreateLocationDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| name | string | Sim | Nome do local |
| address | string | Sim | Endereço |
| timezone | string | Sim | Timezone IANA |
| latitude | number | Não | Latitude |
| longitude | number | Não | Longitude |
| attendanceType | enum | Não | Tipo de atendimento |
| phone | string | Não | Telefone |

### CreateServiceDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| categoryId | string | Sim | Categoria do serviço |
| name | string | Sim | Nome do serviço |
| priceCents | number | Sim | Preço em centavos |
| durationMinutes | number | Sim | Duração em minutos |
| bufferMinutes | number | Não | Buffer entre atendimentos |
| description | string | Não | Descrição |

### CreateMembershipDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| userId | string | Sim | ID do usuário |
| role | enum | Sim | OWNER, MANAGER, EMPLOYEE |
| position | string | Sim | Cargo/função |

### CreateAppointmentDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| locationId | string | Sim | ID do local |
| serviceId | string | Sim | ID do serviço |
| startsAt | string | Sim | Início (ISO 8601) |
| endsAt | string | Sim | Fim (ISO 8601) |
| employeeMembershipId | string | Não | ID do profissional |

### CancelAppointmentDto
| Campo | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| reason | string | Sim | Motivo do cancelamento |
| employeeMembershipId | string | Não | ID do profissional |

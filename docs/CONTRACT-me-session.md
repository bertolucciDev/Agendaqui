# CONTRACT FREEZE — `GET /me/session` (fonte única para MOCK-FIRST)

**Status:** CONGELADO pelo EOB em 2026-09-25.
**Natureza:** especificação de contrato para implementação MOCK-FIRST do frontend.
**Proibições ativas:** nenhum endpoint real, migration, alteração de backend/frontend, commit/push/PR neste gate.

---

## 1. Contrato congelado

```http
GET /me/session
Authorization: Bearer <access-token>
200 OK
```

```json
{
  "user": {
    "id": "string"
  },
  "availableModes": ["OWNER", "PROFESSIONAL", "CUSTOMER"],
  "businesses": [
    {
      "id": "string",
      "name": "string",
      "memberships": [
        {
          "id": "string",
          "role": "OWNER | MANAGER | EMPLOYEE",
          "locationIds": ["string"],
          "permissions": ["string"],
          "active": true
        }
      ]
    }
  ],
  "customerProfile": { "id": "string" },
  "isPlatformAdmin": false,
  "preferences": {
    "activeMode": "OWNER",
    "activeBusinessId": "string"
  }
}
```

### Semântica por campo

| campo | tipo | semântica | origem (backend real, depois) |
|---|---|---|---|
| `user.id` | string | identidade do usuário autenticado | `User` |
| `availableModes[]` | enum | personas operáveis; sempre subconjunto de `OWNER, PROFESSIONAL, CUSTOMER`; derivada dos fatos (não persistida como entidade) | derivada: memberships + CustomerProfile |
| `businesses[]` | array | businesses onde há membership **ativa**; sem membership ativa = business ausente | `EmployeeMembership → Business` |
| `businesses[].memberships[]` | array | memberships do usuário naquele business | `EmployeeMembership` |
| `membership.role` | enum | papel organizacional (`OWNER|MANAGER|EMPLOYEE`) — **não é modo** | coluna `role` |
| `membership.locationIds[]` | string[] | locais de atuação da membership (vazio = todos do business) | `locationId(s)` |
| `membership.permissions[]` | string[] | capability strings **computadas no servidor** (ver matriz §3) | mapping role→permissions |
| `membership.active` | bool | membership não revogada | coluna `active` |
| `customerProfile` | objeto \| null | presença ⇒ modo CUSTOMER disponível; criado no signup | `CustomerProfile` |
| `isPlatformAdmin` | bool | admin de plataforma; **não** vira modo/workspace neste frontend | `AdminProfile` presence |
| `preferences.activeMode` | enum \| null | última escolha do usuário (conveniência; **não autorização**) | user preferences |
| `preferences.activeBusinessId` | string \| null | idem | user preferences |

**Invariantes do contrato:**
- `businesses[]` só contém memberships `active=true`.
- `availableModes` é derivada: OWNER/MANAGER presentes ⇒ contém `OWNER`; EMPLOYEE presente ⇒ contém `PROFESSIONAL`; `customerProfile != null` ⇒ contém `CUSTOMER`.
- Sem membership ativa e sem CustomerProfile: `availableModes=[]`, `businesses=[]` (caso degenerado — o frontend deve tratar).
- `preferences` pode ser `null`-valued; nunca bloqueia acesso.

## 2. Regras congeladas

```text
mode != role
mode != tenant
role != permission
activeMode != authorization
activeBusiness != authorization

OWNER/MANAGER  → modo OWNER
EMPLOYEE       → modo PROFESSIONAL
CustomerProfile → habilita modo CUSTOMER
```

- Autorização é sempre server-side, por recurso, contra membership ativa + permissions.
- O contrato é um **catálogo de possibilidades**, não concessão de direitos.
- Troca de modo/tenant no frontend não reloga e não reautoriza: apenas seleciona escopo; cada request continua validado.

## 3. Matriz mínima de permissions (server-computed)

| capability | OWNER | MANAGER | EMPLOYEE |
|---|:---:|:---:|:---:|
| `business:manage` | ✓ | — | — |
| `staff:write` | ✓ | ✓ | — |
| `services:write` | ✓ | ✓ | — |
| `appointments:write` | ✓ | ✓ | ✓ (própria agenda) |
| `appointments:read` | ✓ | ✓ | ✓ (própria agenda) |
| `customers:read` | ✓ | ✓ | — |

- Namespace `recurso:ação`, lower-case.
- Conjunto mínimo deliberado: extensões futuras (finance, reporting, settings) entram por revisão de contrato, não ad hoc.
- Modo CUSTOMER não carrega membership ⇒ `permissions=[]` no contexto customer (booking público é rota pública, não depende deste contrato).

## 4. MOCK-FIRST — regras de implementação (quando D2 abrir)

1. O mock (`src/lib/mock`) deve implementar `/me/session` **exatamente** com este shape, incluindo `locationIds`, `permissions` derivadas da matriz, `availableModes` derivada e `preferences` persistidas em storage do mock.
2. Fixtures mínimas do mock: (a) usuário só-CUSTOMER; (b) OWNER de 1 business; (c) EMPLOYEE em business A + OWNER em business B (multi-persona); (d) EMPLOYEE + CUSTOMER; (e) OWNER + MANAGER no mesmo business (duas memberships, se permitido) ou em businesses distintos.
3. Frontend implementa `SessionProvider` (resolve `/me/session` pós-login) e `WorkspaceProvider` (activeMode/activeBusiness validados contra o catálogo; invalidação de query keys por prefixo na troca).
4. Divergência entre mock e esta spec = bug do mock, não "melhoria". Mudança de contrato exige novo freeze.

## 5. Ambiguidades restantes (podem ser resolvidas sem reabrir o freeze principal)

1. `locationIds`: semântica exata de membership sem local definido (todos vs. nenhum) — mock assume `[]` = todos os locais do business.
2. Múltiplas memberships no mesmo business (OWNER+MANAGER): mock permite; unicidade real é decisão de backend — contrato suporta ambos.
3. Paginação: contrato assume lista completa de businesses do usuário (N pequeno). Se explodir, revisar.
4. `preferences` null vs. campo ausente: especificado como sempre presente, valores nullable.
5. Comportamento quando `user.status=SUSPENDED`: contrato responde igual; enforcement de bloqueio é da camada de auth, não deste endpoint.
6. Versionamento do contrato: sem `version` no payload; se surgir v2, novo freeze.

## 6. Pontos que dependem do backend real (UNKNOWN carregado)

1. Enforcement de isolamento de tenant em **todos** os endpoints existentes (assumido; não auditado — backend não está neste workspace).
2. Criação atômica de `CustomerProfile` no signup e de membership OWNER na criação de business (mock faz; backend precisa garantir).
3. Endpoint de persistência de `preferences` (PUT/patch) — não definido neste freeze; frontend pode iniciar com localStorage e adicionar depois sem mudar o GET.
4. Códigos de erro canônicos (`403 {code}`, `404` sem vazamento de existência) — recomendação registrada; formalização com o backend.
5. Expansão de capabilities por membership (overrides) — fora do conjunto mínimo; decisão futura.

---

**Referências:** `docs/return-uiux-agendaqui-FRONTEND-REWORK-D1.md` (investigação), Backend Contract Gate (discovery, 2026-09-25). Ordem de execução recomendada pós-freeze: mock-first do contrato → FRONTEND-D2 (Session/Workspace) → backend real adere ao contrato.

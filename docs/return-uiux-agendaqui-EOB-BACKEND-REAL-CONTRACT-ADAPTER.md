# RETURN — EOB BACKEND REAL CONTRACT ADAPTER (gate executado em modo discovery)

**Data:** 2026-09-26 · **Missão recebida:** implementar aderência do backend real ao contrato congelado. **Regras do gate respeitadas:** nenhum commit/push/PR; nenhuma alteração sem investigação.

---

## 0. BLOQUEIO ESTRUTURAL (impede implementação nesta máquina)

O repositório do backend real **`LanzaDev/agendaqui-api` (branch `rework`)** **não está presente neste workspace**:
- `ls /home/inetserver`: nenhum diretório agendaqui-api; `Rebucci-back` = outro produto ("Rebucci API", Express, domínio "padrao400"); `"Sistema para minha empresa/api"` = projeto NestJS de artifacts/checklists (sem modelos do domínio Agendaqui).
- Zips `agendaqui-web.zip`/`agendaquiweb.zip` = snapshots do frontend.
- Índice do último backup diário (`backups/InetServer-backup-20260926-030001.tar.gz`) varrido por `agendaqui-api|LanzaDev` → **0 ocorrências**.

**Consequência:** implementar o adapter nesta máquina criaria código fantasma (não testável contra o server vivo em `agendaqui-api.onrender.com`). Implementação exige: acesso ao repo `LanzaDev/agendaqui-api`, `git clone`, branch nova a partir de `rework` (ou `main` conforme o dono), env de staging.

## 1. DIAGNÓSTICO (10 investigações × evidência disponível)

Evidência utilizada: retorno de engenharia de 2026-09-22 (`docs/return-eob-backend.md`, snapshot no zip do front) — validação ao vivo do backend com correções locais na branch `rework`, **não commitadas** naquela data.

| # | Item | Estado | Evidência base |
|---|---|---|---|
| 1 | Isolamento por membership | **NÃO EXISTIA em 22/09** (P1: listagem de appointments aberta a qualquer autenticado); fixes locais na `rework` (ownerUserId/membership OWNER·MANAGER); **estado final em produção: UNKNOWN** | return-eob-backend §P1 |
| 2 | Unicidade membership (user,business) | UNKNOWN | não evidenciado |
| 3 | Materialização de OWNER | **CONFIRMADO que NÃO há materialização**: owner é `Business.ownerUserId` (campo), não membership | return-eob-backend §3 (autorização por "dono/gerente") |
| 4 | CustomerProfile criado no signup | UNKNOWN (entidade existe no modelo consumido) | types |
| 5 | Modelo atual de AdminProfile | UNKNOWN (entidade existe com `role: string`) | types |
| 6 | Matriz real de permissions | **NÃO EXISTE server-computed**; autorização era ad hoc por role | return-eob-backend §3 |
| 7 | Persistência p/ preferences | **NÃO EXISTE** (precisa migration) | nada no modelo consumido |
| 8 | Tenant scoping | Path-based por recurso (`/businesses/:id/...`); validação ausente → fixada (local) por membership | return-eob-backend §P1/§3 |
| 9 | activeBusinessId inválido | spec congelada: ignorar → front resolve por seleção explícita; backend não deve 5xx | contract freeze |
| 10 | activeMode indisponível | idem | contract freeze |

### Impacto no contrato congelado (atenção EOB)
O item 3 quebra uma premissa do freeze ("backend materializa membership OWNER"). **Ajuste necessário ao implementar**: quando `user.id === Business.ownerUserId`, o adapter **sintetiza** uma membership virtual `role: OWNER` na resposta (sem criar linha) — ou se migra o schema para materializar. A resposta ao cliente é idêntica; a decisão é interna do backend. Frontend não muda.

## 2–4. ARQUIVOS/MIGRATIONS/ENDPOINTS (proposta de CR, não implementada)

```text
CR-B1  GET /me/session (controller + service + tests)
CR-B2  Migration: UserPreferences { userId PK, activeMode String?, activeBusinessId String?, updatedAt }
CR-B3  PATCH /me/preferences (opcional; freeze permite cache local no front por ora)
CR-B4  Permissions server-computed: mapa estático role→capabilities (matriz mínima do freeze)
CR-B5  Doc: ownerUserId ⇒ membership virtual OWNER na resposta (sem migration de dados)
```

**Mudança de schema:** somente a tabela nova de preferences (CR-B2). Nenhum endpoint existente removido/modificado fora de adições.

## 5–8. CONTRATOS / AUTORIZAÇÃO / TENANT / PERMISSIONS
Contrato = o congelado (verbatim). Autorização: manter a regra corrigida da `rework` (owner `ownerUserId` **ou** membership ativa `OWNER|MANAGER` para gestão; leitura por posse para clientes). Tenant: **continuar path-based** e validar membership em middleware por recurso — adapter não reinventa. Permissions: começar pelo conjunto mínimo do freeze (business:manage, staff:write, services:write, appointments:read/write, customers:read).

## 9–10. TESTES / EVIDÊNCIAS (a executar no repo do backend)
Os 13 cenários obrigatórios do gate ficam **mapeados 1:1**: fixtures nesta stack: biz demo (owner demo), spa (owner olivia), memberships u_3 MANAGER, u_1/u_2 EMPLOYEE, u_cust só CustomerProfile, olivia OWNER+MANAGER+EMPLOYEE multi-business. Cross-tenant: GET appointments de business de outro user ⇒ 403/404. Preference inválida: retornar nulls e não quebrar. platform admin: isPlatformAdmin=true apenas com AdminProfile.
**Evidência exigida:** suite unit+integration do adapter verde + tabela de status (200/401/403/404/409 por cenário) — mesmo formato do §3 do retorno de 22/09.

## 11. COMPATIBILIDADE
100% aditivo. Endpoints existentes intocados. O frontend já está pronto (branch `feat/d2-context-architecture`, PR #2) consumindo o contrato via mock; quando o real responder, a troca é flag `VITE_USE_MOCK=false` + baseURL — sem mudar código.

## 12. RISCOS
- R1 (alto): `rework` local de 22/09 nunca commitada → fixes de P1/P2/P3 podem não estar em produção. Contrato pressupõe isolamento — **gate de entrada para o adapter**: confirmar/mergear primeiro esses fixes.
- R2 (médio): ownerUserId duplicado com membership caso se materialize (evitar dupla fonte de verdade).
- R3 (médio): matriz mínima pode ser insuficiente para relatórios/config — extensão só via novo freeze.
- R4 (baixo): preferences legadas inválidas — tratar como null (spec).

## 13. REGRESSÕES
Nenhuma (nada foi alterado em código, mock ou front — gate de descoberta+especificação).

## 14. DESCONHECIDO (carregado para o dono do backend)
- Estado real de `rework` (commits, deploy)
- Unicidade de membership; quando CustomerProfile nasce; modelo/semântica de AdminProfile
- Migrations e convenções do repo (EF/Prisma? o retorno cita Nest-like `main.ts` + filter global)
- Quais tenants/stages existem (onrender prod + ?)

---

## RECOMENDAÇÃO AO EOB (próxima ação)
Entregar este RETURN + `docs/CONTRACT-me-session.md` ao responsável de `LanzaDev/agendaqui-api` com prioridade: **(1) confirmar/status-merge dos fixes locais de 22/09 (segurança P1 primeiro, pelo amor do booking público); (2) CR-B1/B2/B4; (3) deploy em staging; (4) eu rodo o gate final contra o staging (VITE_USE_MOCK=false) e fecho a rotação com evidência.**

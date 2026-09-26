# RETURN — MOCK-FIRST CONTRACT IMPLEMENTATION

**Data:** 2026-09-25 · **Referência congelada:** `docs/CONTRACT-me-session.md` · **Regra cumprida:** nenhum endpoint real/migration/JWT/banco/sessão real/commit tocados. Mudanças exclusivamente no mock + pontos de consumo tipados.

---

## 1. ARQUIVOS ALTERADOS
| arquivo | mudança |
|---|---|
| `src/lib/mock/db.ts` | interfaces do contrato (`MockCustomerProfile`, `SessionMode`, `MockSessionPreferences`, `SessionMembershipPayload`, `SessionBusinessPayload`, `MeSessionPayload`); MockDb ganhou `customerProfiles[]` + `preferences{}`; fixtures novas (biz_spa, 2 locations, srv_spa1, mem_5/mem_6, u_olivia, u_cust, 3 customerProfiles); normalização de DBs antigas; **fix colateral**: membership `mem_3` referenciava `users[3]` por índice (quebraria com inserts) → `users.find(u=>u.id==='u_3')` |
| `src/lib/mock/handlers.ts` | rota `GET /me/session`; `ROLE_PERMISSIONS` (matriz mínima congelada); `buildMeSession()` (deriva modos/businesses/permissions/customerProfile/preferences) |
| `src/types/session.ts` *(novo)* | tipos TypeScript do contrato (fonte para D2) |
| `src/services/api/session.ts` *(novo)* | `sessionApi.getSession()` — ponto de acesso ao contrato |
| `src/services/api/index.ts` | export do `sessionApi` |

## 2. ESTRUTURA CRIADA
Payload fiel ao freeze: `{ user{id}, availableModes[], businesses[]{id,name,memberships[]{id,role,locationIds[],permissions[],active}}, customerProfile{id}|null, isPlatformAdmin:false, preferences{activeMode,activeBusinessId} }`. Derivações: OWNER/MANAGER⇒modo OWNER; EMPLOYEE⇒PROFESSIONAL; CustomerProfile⇒CUSTOMER. Só memberships `active=true` entram.

## 3. CENÁRIOS COBERTOS (harness headless contra o handler real, esbuild bundle)
1. CUSTOMER puro (`cliente@agendaqui.app`): modes=[CUSTOMER], businesses=[] ✓
2. OWNER (`demo@agendaqui.app`): OWNER + business + permissions completas + locationIds ✓ (também CUSTOMER via customerProfile)
3. PROFESSIONAL puro (`carlos.andrade@…`): modes=[PROFESSIONAL], permissions mínimas ✓
4. Multi-persona (`olivia@agendaqui.app`): OWNER+PROFESSIONAL+CUSTOMER ✓
5. Multi-business (olivia): biz_spa (OWNER) + biz_demo (EMPLOYEE), permissions distintas por membership ✓
6. Multi-location: locations por membership (`loc_spa_1` vs `loc_2`) ✓
7. MANAGER ⇒ modo OWNER; sem `business:manage` ✓
8. EMPLOYEE ⇒ PROFESSIONAL ✓ (u_1, u_2)
Extras: shape com `isPlatformAdmin=false`, `preferences` nullable, **22/22 PASS**.

## 4. TESTES EXECUTADOS
- Harness node×esbuild do handler real: **22/22 PASS** (matriz de modos, permissions por membership, locationIds, shape).
- `tsc -b` exit=0 · build production-demo exit=0 (após todas as alterações).
- Smoke browser (preview :4173, build final): logins `demo`/`olivia`/`cliente` → dashboard renderiza; **0 console.error/pageerror/requestfailed**.
- Fluxos anteriores não testados novamente aqui (mock seed preservado; create-locations/appointments da FE-01.1 são coberturas ainda válidas).

## 5. LIMITAÇÕES (honestas)
- L1: o mock nunca devolve 401 em `/me/session` porque `sessionUserId` é seedado com `u_demo` — comportamento **pré-existente** do mock (igual à rota `/auth/me`). Enforcement real de auth fica para o backend.
- L2: `locationIds` é derivado do `locationId` singular da membership atual do domínio mock (`[]`/unitário). Múltiplos locais por membership exigiriam evolução do modelo (decisão de produto futura).
- L3: `preferences` é só leitura (necidade de write-endpoint fica para o backend; front pode usar localStorage como cache sem mudar o GET).
- L4: fixtures de Olívia têm service massagem vinculada ao membership mem_5 (cobertura de employeeId em bookings).

## 6. INCOMPATIBILIDADE ENCONTRADA COM O CÓDIGO ATUAL
- **A tela `/businesses` não consome a API** — usa `businessesApi.list()` que lê da `business-store` localStorage (seeded só com biz_demo). Consequentemente, mesmo com 2 businesses na sessão de Olívia, a UI atual lista só "Barbearia Elite". **Isso NÃO é bug do mock**: é o problema arquitetônico já catalogado no FRONTEND-REWORK-D1 (§3). Resolver = D2 (SessionProvider/WorkspaceProvider + migrar `businessesApi.list` para `/me/session` ou endpoint de businesses por membership). Fora do escopo deste gate.
- Após troca real para o contrato, eliminar `getStoredBusinesses/saveStoredBusiness` e o fallback `businesses[0]`.

## PRÓXIMO PASSO SUGERIDO
**FRONTEND-D2 (sessão/workspace):** SessionProvider lendo `sessionApi.getSession()` pós-login → WorkspaceProvider (activeMode/activeBusiness validados contra o catálogo) → nav por capabilities → aposentar `businesses[0]`. Prompt pronto para gerar quando autorizar.
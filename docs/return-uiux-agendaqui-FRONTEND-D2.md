# RETURN — FRONTEND-D2 (arquitetura de contexto sobre o contrato congelado)

**Data:** 2026-09-25 · **Base:** CONTRACT FREEZE + MOCK-FIRST · **Regra:** nenhum backend/JWT/DB/migrations/endpoints alterados; mock-only já entregue no passo anterior.

---

## STATUS
**CONCLUÍDO com evidência objetiva** (24/24 testes do runner D2, tsc=0, build=0, axe/matrizes limpas, zero console/pageerror/requestfailed).

## ARQUIVOS ALTERADOS
**Novos:**
- `src/app/providers/session.tsx` — SessionProvider (consome `sessionApi.getSession` via TanStack `['session']`, gated por auth; expõe session/isLoading/refreshSession)
- `src/app/providers/workspace.tsx` — WorkspaceProvider (activeMode/activeBusiness/activeMembership/activeLocationId/permissions + switchMode/switchBusiness/switchLocation + cache localStorage validado contra catálogo)
- `src/components/layout/workspace-gate.tsx` — resolver de contexto (nunca businesses[0]); `<main>` landmark, radiogroup para modos
- `src/types/session.ts`, `src/services/api/session.ts` (do passo MOCK-FIRST)

**Alterados:**
- `src/app/providers/index.tsx` — cadeia Auth → Session → Workspace → Router
- `src/App.tsx` — rotas protegidas embrulhadas em `<WorkspaceGate>`
- `src/app/hooks/use-active-business.ts` — vira shim do workspace (mantém API {business, businesses, businessId, activeMode, isLoading, isContextReady})
- `src/components/layout/dashboard-layout.tsx` — BusinessSwitcher validado (só businesses compatíveis com o modo) + ModeSwitcher (select, ≥2 modos) + LocationSwitcher (select, ≥2 locais na membership) + remoção de `business-store` uso em resolução
- `src/pages/businesses.tsx` — lista vem do catálogo da sessão; label de papel via membership; delete invalida `['session']`
- Query keys com `activeMode` em: appointments, staff, services, locations, dashboard (employees/today), staff.new, appointments.new
- `src/pages/onboarding.tsx` + `businesses.new.tsx` — invalidam `['session']` após criar negócio
- `src/lib/mock/handlers.ts` — OWNER/MANAGER herdam todos os locais ativos do business em `locationIds` (cobertura de gestão; EMPLOYEE segue o próprio location)
- `src/lib/mock/db.ts` — fixture extra `mem_7` (Olívia MANAGER em biz_demo) para troca real de business dentro do mesmo modo

## ARQUITETURA ANTES
`AuthProvider → useActiveBusiness(localStorage store + businessesApi.list da store + fallback businesses[0])`. Sem mode/membership/permissions. Dashboard único implícito.

## ARQUITETURA DEPOIS
```
AuthProvider (identidade/tokens — inalterado)
└─ SessionProvider  — GET /me/session (contrato congelado)
   └─ WorkspaceProvider — contexto ativo validado (validação por catálogo; cache ≠ autorização)
      └─ WorkspaceGate — resolve ambiguidade sem índice
         └─ DashboardLayout (ModeSwitcher | BusinessSwitcher | LocationSwitcher | ThemeSwitch)
            └─ Pages (query keys com activeMode+businessId)
```

## SESSION PROVIDER
Expostos (evidência: arquivo + uso): `session.user`, `availableModes`, `businesses`, `customerProfile`, `isPlatformAdmin`, `preferences`, `refreshSession()`. Carregado só quando autenticado.

## WORKSPACE PROVIDER
Expostos: `activeMode`, `activeBusiness`, `activeMembership`, `activeLocationId`, `permissions[]`, `businessesForMode`, `hasPermission`, `switchMode/switchBusiness/switchLocation`, `needsSelection`, `isContextReady`.
Regras de resolução congeladas: preferência válida → escolha única (1 compatível) → ambíguo = seleção explícita (gate). Nenhum índice como mecanismo de resolução.

## MODE SWITCH
Sidebar `select` quando `availableModes.length>1`. Troca valida membership compatível, zera business se incompatível, invalida todas as queries. Sem logout (prova T9: URL protegida mantida, conteúdo troca).

## BUSINESS SWITCH
Dropdown só com businesses compatíveis com o modo ativo; troca invalida e refaz queries (prova T12: /services spa vs barbearia trocam conteúdo imediatamente).

## LOCATION SWITCH
Select mostrado quando membership ativa tem >1 local (OWNER/MANAGER herdem todos os locais ativos; EMPLOYEE só o seu). "Todos os locais" = escopo amplo (sem filtro).

## QUERY KEYS
Antes: `['staff', businessId]`, … Depois: `['staff', activeMode, businessId]`, idem services/locations/appointments*/business-employees/booking continuam com slug (contexto público). Invalidações por prefixo mantidas + invalidação global ao trocar contexto.

## TESTES (13 obrigatórios → 24 asserts executados, 24 PASS)
1. 1 business ✓  2. múltiplos businesses ✓  3. múltiplas memberships ✓  4. OWNER ✓  5. MANAGER ✓  6. EMPLOYEE ✓  7. CUSTOMER ✓  8. múltiplos modos ✓  9. troca de modo sem logout ✓  10. troca de business sem logout ✓  11. troca de location ✓  12. query invalidation/refetch ✓ (DOM troca antes/depois)  13. ausência de businesses[0] ✓ (grep literal zerado fora dos comentários + comportamento do gate)

## EVIDÊNCIAS
- Runner D2: `/tmp/fe01-audit/d2-exec-2.log` → `RESULT 24 pass / 0 fail`
- Regressão FE-01/02: matriz axe completa zerada (dashboard/appointments/booking/forms/mobile); restam somente achados pré-existentes catalogados (button-name/heading-order do dialog; link/select/heading das lazy pages)
- create-location pós-D2 (com gate): submit→lista→refresh persiste, 0 erros
- tsc/build finais = 0

## REGRESSÕES
- Nenhuma funcional. Impacto de UX documentado: multi-modo passa a exigir 1 clique de resolução na primeira sessão (depois cache persiste) — *by design* (resolver).
- Fix dentro do ciclo: gate page sem `<main>` → corrigido; select de modo/location com label/aria ✓.

## PENDÊNCIAS
- Fix-A11Y pré-existentes (dialog close name/heading; lazy-page links/selects/heading).
- Backend real do contrato (isolamento, 401 real, persistência de preferences).
- Deploy Vercel (bloqueado por credencial).
- Sugestão de PR #2 acumulado (FE-01/01.1/02 + mock-first + D2) — aguardando autorização.

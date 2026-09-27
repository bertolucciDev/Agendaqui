# FRONTEND-D1 — RETURN
**Agendaqui Web · investigação arquitetural · somente leitura**
Data: 2026-09-25 · Escopo: React 19+TS+Vite, React Router, TanStack Query, RHF+Zod, Tailwind, Axios · Regra cumprida: **nenhuma linha de código alterada**.

---

## 1. EXECUTIVE SUMMARY

O frontend é uma SPA bem organizada com domínio de Bbookings maduro (10 entidades, mock rico, tipos claros), mas **tem uma contração arquitetônica crítica de contexto**: o conceito de "quem sou, em que negócio atuo, com que papel" é **ausente do estado de sessão** e **paradoxalmente simulado em localStorage/lib próprios** incoerentes. A UI/deployment atual é um "dashboard único para 1 negócio" com acessos implícitos a `businesses[0]` — que a QA-D5 já havia provado quebrar (CTAs dead-link → Home). A transição para a arquitetura pedida (multi-tenant + modos) **não será um redesign visual**, e sim uma **refundação da o camada de contexto** — caminho recomendado: evolucionar *de dentro para fora* (Session → Mode → Tenant → Nav → Tema) e não redesenhar páginas primeiro.

## 2. ARQUITETURA ATUAL

- **Roteamento**: `src/App.tsx`, React Router v6, lazy routes sob `DashboardLayout` guardiada por `ProtectedRoute`; book público isolado em `/book/:slug`; fallback global `*` → `Navigate to /`.
- **Estado servidor**: TanStack Query (páginas administram `useQuery`/`useMutation`, chaves como `['locations', businessId]`).
- **Estado cliente**: `AuthProvider` (apenas `user`, tokens), `useActiveBusiness` (business ativo lido de `localStorage` lib própria), **sem estado formal de membership/permissions/mode**.
- **Regras de negócio**: services em `src/services/api/*` (axios) que no runtime mock chamam handlers (`src/lib/mock/handlers.ts`); **mock mantém memberships, sessionUserId, slug/config de business** — o backend **nessa versão existe só como mock**.
- **Design system**: `components/ui/*` primitives (avatar/badge/button/card/empty-state/input/page/select/skeleton) + `components/layout/dashboard-layout.tsx` e `components/shared/*` + dominíos (appointments, booking, dashboard, staff, wizard). **Muita coisa nova já é fechada** (forms novos D6 com a11y ok), as bases são reaproveitáveis.

## 3. MULTI-TENANT AUDIT

**CONFIRMADO (literal):**
- `src/pages/dashboard.tsx:…` e `src/pages/appointments.tsx:…` leem `businesses?[0]?.id` / equivalente — via hook `use-active-business.ts` (que também tem o fallback `|| businesses[0]` na linha 12).
- **O conceito transversal de tenant ativo existe**, mas **não como contexto**: `src/lib/business-store.ts` salva `agendaqui:businesses` + `agendaqui:active-business` em localStorage e reatualiza `activeId` por chamada — **não é reativo, não tem validação de membership, não tem autorização**.
- Páginas que dependem de `businessId` (`staff.new.tsx`, `services.new.tsx` confirmado pelos imports/keys) — três ou mais pontos com contexto implícito.
- Booking público usa `slug` (`/book/barbearia-elite`) — **caminho tenant explícito e correto**.

**Tabela requerida (arquivo | comportamento | contexto | risco | correção):**
| Arquivo | Comportamento | Contexto usado | Risco | Correção |
|---|---|---|---|---|
| `src/app/hooks/use-active-business.ts` | Fallback para businesses[0] | localStorage + first business | troca de tenant **não reativa**; fallback exibe dados do primeiro mesmo se membership inválida | migrar para SessionContext→activeBusiness validado |
| `src/pages/dashboard.tsx` | lê id e renderiza | businesses[0] implicit | com N negócios, usuário vê o errado | consumir activeBusiness do SessionContext |
| `src/pages/appointments.tsx` | mesma coisa | businesses[0] | agenda/admin fica misturada por business errado | activeMembership + capabilities |
| `src/pages/staff.new.tsx` | CTA de nova staff exige `businessId` | activeBusiness local | POST de convite sem tenant correto | usar SessionContext + backend valida |
| `src/lib/business-store.ts` | persiste slug, businessId | localStorage | pode perder sincronização com memberships | substituir por store unificado com TanStack Query |

**PROVÁVEL**: com múltiplos businesses, sem trocar explicitamente, staff/list vão operar no primeiro do GET /businesses → vazamento operacional visual.
**DESCONHECIDO**: como o backend real (quando sair do mock) vai isolar (token por tenant? header X-Business-Id? objeto de contexto?) — **precisa do BACKEND CONTRACT GATE**.

## 4. MODE OF ACTING MODEL

- **CONFIRMADO**: domínio expressa roles: `MembershipRole = OWNER | MANAGER | EMPLOYEE` (types/index.ts:3) e existem separados `CustomerProfile` e `AdminProfile` (l.149, l.156) — portanto o projeto **já distingue** ator humano (Client/Profissional) de papel organizacional (Owner/Manager/Employee).
- **Mode ≠ role**: o contrato definitivo deve ser `modes[]` resolvido por sessão (ex: OWNER+sócio da Barbearia A; EMPLOYEE+profissional da Barbearia B; CUSTOMER consumidor), não reinterpretações de MembershipRole.
- Recomendo: `modes` = lista de possibilidades do usuário logado derivada de (memberships × businessAtivas) + customerProfile; `activeMode` ∈ {owner, professional, customer}; objeto de contexto `{ mode, businessId?, locationId?, membershipId?, permissions: string[] }`.
- Troca de modo sem logout: onboarding/switch atualiza p contexto, invalida query keys dependentes e limpa seleções antigas.

## 5. SESSION MODEL

**Estado de hoje (literal):** `AuthContextType { user, isAuthenticated, isEmailVerified, isLoading, login, register, logout, updateUser }`. Só autenticação. Nenhum atributo organizacional.

**Alvo proposto (não implementado):** um **SessionProvider** separado do AuthProvider:
```
AuthProvider (identidade: tokens, user)
└─ SessionProvider (resolução pós-login)
   └─ WorkspaceProvider (tenant/modo/permissions ativas + ações switchMode/switchTenant/switchLocation)
```
**Dados de sessão:** `availableModes[]`, `activeMode`, memberships/detalhes (businessName, locationName, role), `permissions[]`, `isResolved` (loading de resolução). Fonte de verdade **backend** (mock já tem memberships+users; depois vira GET `/me/context` ou similar). **localStorage atual migra para cache reativo desse provider.**

## 6. ROUTING AUDIT

Atual (literal): públicas `('/', '/login', '/register', '/verify-email','/forgot-password')`, autenticadas em DashboardLayout (`/dashboard`, `/businesses`, `/businesses/new`, `/locations`, `/locations/new` (nova, D6), `/services`, `/services/new`, `/staff`, `/staff/new`, `/appointments`, `/appointments/new` (nova), `/settings`, `/onboarding`), booking público `/book/:slug`, wildcard redireciona para `/`.

**Classificação:** todas as autenticadas **são tratadas como uma única classe "administrador"** — hoje não há nested por modo. Arquitetura futura (evolutiva): manter paths estáveis e derivar **por capabilities** do SessionContext (ex: `/appointments` e `/appointments/new` só com `mode===professional|owner|manager` + regra). Não criar três árvores/three apps; introduzir wrapper/Menu derivado de permissions.

## 7. NAVIGATION AUDIT

- `dashboard-layout.tsx` concentra: sidebar (logo, perfil, links), mobile toggle, `<Outlet>`, **e nem mode nem tenant switcher** (grep literal: nenhum switcher; logout direto).
- **Hoje links fixos por array** (pré-condição: membro administrativo). Alvo: `AppShell { Topbar(ModeSwitcher | TenantSwitcher | UserMenu) + Sidebar(nav calculada por capabilities) + Content }`, reaproveitando primitive `Avatar`, `button`, `card`.
- Botão de lougout atual dentro do UserMenu → preservar; adicionar "Trocar modo/tenant" abrindo a mesma tela de resolução de sessão (sem sair).

## 8. THEME AUDIT

- Tokens Tailwind existem: `warm` palette completa, `primary`, `accent`, `ink` etc (tailwind.config.js presente). **Mas** valores hardcoded dominam: grep literal → `text-ink-muted` ×76, `text-foreground` ×76, `border-warm-200` ×52, `bg-white` ×29, `bg-warm-50`, `text-ink-faint` ×27, etc. — dark mode atual **quebraria em massa**.
- Estratégia: migrar componentes primitives para semantic tokens (`bg-surface`, `text-foreground`, `border-subtle`, etc), manter `warm` como escala base de mapeamento; adicionar `ThemeProvider` root class toggling `dark`, persistência em preferência do usuário (fallback `prefers-color-scheme`).

## 9. UI/UX AUDIT

Por página/flow (baseado em APP.tsx e componentes):

- **Públicas**: home.tsx, login.tsx, register.tsx, verify-email.tsx, forgot-password.tsx, booking/index.tsx (público; fallback já corrigido D11/D6) — maduras; `forgot/verify` sem caminho de mode resolution.
- **Autenticadas**: dashboard.tsx, businesses/new, locations/list/new (D6 criados), services/new, staff/new, appointments/list/new (D6 criados), settings.tsx, onboarding.tsx — forms têm validação RHF+Zod, toast e navegação corretos; lista appointments calendar diário; **falta** feedbacks de stale/persistência multi-tenant (a classe P2/P3 de QA-D5 e o a11y herdado — `label/não-ligado` por input, color-contrast/9 em appointments — não corrigidos aqui por escopo).
- **Estados gerais**: EmptyState usado (exception sound), skeletons e toasts presentes; **falta** telas de resolução de sessão/seleção de modo e de troca de tenant (gap de UX principal).
- **Acessibilidade**: novo código nos forms OK (link/article axe=[]); páginas legadas com items P2 confirmados (`heading-order/1` home+locations, `button-name/2`, `color-contrast/9`, `label/N` sistêmico no Input).

## 10. DESIGN SYSTEM AUDIT

Componentes primitives sólidos (button/card/input/select/skeleton/empty-state/avatar/badge/page). Falta: `Topbar`, `Sidebar` isolável, `ModeSwitcher`, `TenantSwitcher`, `Breadcrumbs`, `CommandSearch`, **alias de cor semântica para modo dark** (ver item 8). Keep: primitives (button/card/page/empty-state); Refactor: Input (fazer label<->input oficialmente, hoje SÓ visual), DashboardLayout → decompor; New: AppShell/ModeSwitcher/TenantSwitcher/Session screens.

## 11. FRONTEND FLOW AUDIT

- **login**: API: login → "/" não resolução: hoje funciona mock POST /auth/login, cria sessionUserId e devolve usuário; falta etapa "Resolver modos" antes de empurrar para `/dashboard`.
- **onboarding**: existe página `/onboarding` (wizard `components/wizard/onboarding-wizard.tsx`) — integrar como criação/aceitação inicial de membership/business e estabelecedora de contexto.
- **booking** (público): funciona como controle (per fixed D11 + controle axe=[]); não deve ser usado como prova de admin.
- **Appointments**: tela atual é calendário+lista de listagem (sem form admin — criado na D6); faltam estados de loading/empty per-location (EmptyState usado, ok).

## 12. QUERY/CACHE AUDIT

- Padrões existentes bem: chaves como `['locations', businessId]`, `['services', businessId]`, `['appointments', businessId?]` (servidor-dependentes).
- Gap: **ausência de modo/membership nas keys** — ao trocar modo, queries antigas podem vazamentos/stale (D5: `appointments.new.tsx` já lia o `businessId` corretamente; precisa herdar também membership/tenant). Política: `onSwitchMode/onSwitchTenant/onSwitchLocation` invalidam grupos por queryKey com tenant/membership/modo.

## 13. INTEGRATION ARCHITECTURE

Camada services/api está saudável (por domínio) — keep. Futuro: adapter pattern isolando HTTP/mock backend: `Service → Adapter → Cliente Http → conversores`, com erros canônicos e mapeamento de contexto por request (header/token de business). Não implementar.

## 14. SECURITY/RISK

**Riscos potenciais (não falha comprovada):** localStorage AChave `agendaqui:active-business` não validada com membership do usuário (quem editar muda via mock sem validação); fallback `businesses[0]` quando obter ativo; etoques redirects `/` quando rota ausente — podem ser confundidos por admin/client; cache cross-tenant com mesmas chaves.
**A tomar antes de implementar:** tenant no front **só** vem do backend autorizado (seminho) e clearance por query key + reset ao trocar.

## 15. KEEP / REFACTOR / REBUILD / NEW

- **KEEP**: components/ui/*; services/api/*; mock handlers (execelente juízo de QA); React Router+TanStack+RHF/Zod libs; pipeline build+preview (D4 usa).
- **REFACTOR**: `auth.tsx` → AuthProvider → (Auth+Session+Workspace) providers; `useActiveBusiness` → SessionContext-backed; `Input` (label assoc; FIX-A11Y); `DashboardLayout` → AppShell+Sidebar+Topbar com switchers.
- **REBUILD**: `App.tsx` RouterTree (introduz nested `mode`-scoped routes; state-of-the-art); Theme (semantic tokens + dark ooverhaul atoma/r).
- **NEW**: `SessionResolverScreen` (selecionar modo), `WorkspaceSwitcher` UI, `usePermissions`, backend contract `GET /me/context`, query-key policy, forma de resolver pós-login (`/select-mode` apenas se >1 modo).

## 16. BACKEND CONTRACT GAPS

- Endpoint p/ obter modos e contexto do usuário (memberships por user, businesses, roles ativas). Mock possui memberships, mas falta contrato `me/context` formal.
- Como membership aparece no token vs API consultada.
- Regras de permissão (map capability → endpoints UI pode chamar).
- Tenant-switch (não é logout/login; token do workspace ativo ou outra reautorização).
- Customer/Professional/Owner de um mesmo user (múltiplas memberships) — hoje CustomerProfile/AdminProfile/other existem, falta formalizar.
- **GATE obrigatório antes de implementar**: definir contratos com dono backend, Não presumir.

## 17. PROPOSED TARGET ARCHITECTURE

`RouteGuard(Auth only) → SessionResolver (Gateway /me/context) → ModeSelect (se >1, senão direto) → WorkspaceContext { tenant, mode, membership, permissions }… → AppShell → Feature pages por capabilities`. Logout em AuthProvider; switchMode/JTenant no WorkspaceContext com query reset.

## 18. IMPLEMENTATION PHASES

A) Discovery (backend contract) → B) Session/SessionStorage + resolver (login) → C) Modes/troca + tenant switch (Invalidate key) → D) AppShell/Nav-derived + Theme semantic → E) Auth + Workspace fixtures + QA (Playwright/axe) regressão → F) Booking público controle.

## 19. ACCEPTANCE CRITERIA

Fechar quando: (i) login "resolve" modos/tenants por backend; (ii) uma conta com múltiplas memberships vê apenas nav permitida e consegue trocar modo/tenant sem logout; (iii) sem businesses[0]; (iv) tema sem cores hardcoded nos primitives; (v) API layer unida com adapters; (vi) UI/UX audited pela matriz (owner/professional/customer).

## 20. CONTEXT MISSING

- Contrato backend concreto (não-mock) p/ identity↔membership↔business↔permissions; autenticação por tenant/scope; política oficial de tema; variáveis/staging; design assets.
- O "modo de atuação" textual oficial (Owner/Manager/Professional/Customer naming).

## 21. DECISION GATE

**NÃO liberar implementação ainda.** Próxima fase: **D2 = Backend Contract + Architecture Gate** — decidir contratos, mapear capabilities, definir SessionModel e ancestors. Só depois D3 = Architecture/Tokens/Theme, D4 = AppShell/Nav, D5+ = Fluxos por modo. Implementação só dps.

**Natureza do délivreable**: documento de investigação (análise/arquitetura). Nenhuma alteração de código autorizada **nem feita**. `src/` intacto; mock preservado.

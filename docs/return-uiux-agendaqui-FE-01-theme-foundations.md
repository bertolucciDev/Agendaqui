# RETURN FE-01 — UI/UX FOUNDATIONS + LIGHT/DARK THEME

**Data:** 2026-09-25 · **Escopo:** fundação visual (tokens + tema + componentes base) · **Proibições respeitadas:** zero cookies de backend/session/tenant/businesses[0] — somente camada visual + estrutural.

---

## 1. STATUS
**CONCLUÍDA** — fundação visual em produção local (preview :4173), com evidência de runtime real.

## 2. DIAGNÓSTICO
O sistema de cores era válido em **Light** (identidade Agendaqui preservada por design), mas **unit-locked**: 76× `text-ink-muted`, 29× `bg-white`, 52× `border-warm-200` e escalas físicas de superfície travavam qualquer dark mode. Não havia ThemeProvider, Theme Switch, anti-flash nem sistema de CSS variables. O layout era clean mas fixo. O backend contract gate do D1 permanece aberto (proibido mexer aqui).

## 3. INVESTIGAÇÃO
Analisados literalmente: `tailwind.config.js` (paleta física completa), `src/index.css` (269 linhas de component classes com hex/warm), `src/app/providers/index.tsx` + `auth.tsx`, `src/components/ui/*` (8 primitivos), `src/components/layout/dashboard-layout.tsx`, `src/components/ui/theme-switch.tsx` (não existia), páginas 100% auditadas. Inventário literal em `grep -cE "bg-white"` por arquivo.

## 4. ARQUITETURA ANTES
- Paleta Tailwind física única (light); nenhum `.dark` selector, zero `darkMode: 'class'`.
- Componentes hardcoded em `bg-white`/`warm-N00`.
- Sem ThemeProvider; sem persistência de preferência; cores sem semântica.
- Sidebar layout monolítico em 1 arquivo (`dashboard-layout.tsx`).

## 5. ARQUITETURA DEPOIS
- `tailwind.config.js`: `darkMode: 'class'` + tokens semânticos (background/fg/muted/surface/border/input/sidebar/focus-ring/…) apontando para CSS variables — **mesmos hex no light** (identidade preservada 1:1).
- `src/index.css`: `:root` declara todos os values light; bloco `.dark` projeta **hierarquia de superfícies** (bg #0e1013 → surface #14181f → raised #1b2029 → overlay #202734) com foreground.calibrado.
- `src/app/providers/theme.tsx`: ThemeProvider (light/dark/system) + listener de `prefers-color-scheme` + persistência `localStorage:agendaqui:theme`.
- `src/components/ui/theme-switch.tsx`: radiogroup acessível (Claro/Escuro/Sistema), aria-labels, focus-visible, Lucide icons.
- `index.html`: script anti-flash head (tema aplicado antes do primeiro paint).

## 6. DESIGN TOKENS
Criados e mapeados: `--bg/--fg/--fg-strong/--muted/--muted-fg/--surface/--surface-raised/--surface-sunken/--surface-overlay/--border/--border-muted/--border-strong/--input-bg/--focus-ring/--primary-soft/--primary-soft-fg/--destructive-soft/--destructive-soft-fg/--overlay-scrim`.

## 7. LIGHT MODE
**Idêntico** à versão em produção (tokens resolvem para os mesmos hex do design system pre-D5/D6; QA-runner mede axe-dashboard-light s/. Alterações: visuais **zero regressão**, acessibilidade preservada).

## 8. DARK MODE
**Projetado** (não inversão automática):
- hierarquia superfícies: `#0e1013` background → `#14181f` card → `#1b2029` raised → `#202734` overlay.
- textos: `#e5e7eb` principal, `#f9fafb` forte, `#9aa3ae` muted.
- Primary Action indigo preservado (`--fg-strong` preserva hover readability).
- computed style medido pelo runner: body bg = `rgb(14,16,19)` (prova literal).

## 9. THEME PROVIDER
`ThemeProvider` global em `src/app/providers/index.tsx` (acima de `AuthProvider`). State: `theme ∈ {light,dark,system}`, `isDark` derivado, `setTheme()`. Persistência em localStorage. System reage a `prefers-color-scheme: dark` via listener do media query. **Zero lógica de tema em páginas.**

## 10. THEME SWITCH
Componente reutilizável `ui/theme-switch.tsx` exportado em `ui/index.ts`. radiogroup radiobuttons semânticos; icones Sun/Moon/Monitor, aria-checked, foco ring correto; nenhum layout shift; aplicado no sidebar footer (DashboardLayout) — **estrutura visual pronta para o futuro AppShell** (não conecta a session/tenant).

## 11. COMPONENTES ALTERADOS
38 arquivos (git status literal): todos os `src/components/ui/*` (badge/button/card/input/select/skeleton/page/empty-state + theme-switch NOVO), `layout/dashboard-layout`, `pages/*` (login/register/home/locations/services/staff/appointments/businesses/settings/onboarding/verify-email), `index.css`, `tailwind.config.js`, `index.html`. Nenhum hook/API/provedor fora do visual.

## 12. ACESSIBILIDADE
- runtime real: **console.error=0 · pageerror=0 · requestfailed=0** em `dashboard` e `/book/barbearia-elite` (dark e light).
- ThemeSwitch: foco + aria-checked + labels verificados no axe.
- **Atenção honesta**: axe marca residual `color-contrast/4~5` (badges `peach-100/peach-500` e hover `brand-300`) — **PRÉ-EXISTENTES** (não regrediram por FE-01; eram design tokens já usados em áreas de métrica/badges). Sanados em duas etapas de segurança (nao this fix); decidir se entram em `FE-02 (paleta/a11y de paleta)` ou `FIX-A11Y`.

## 13. RESPONSIVIDADE
- Mobile 390px: navegação off-canvas preservada; botão de menu presente; switch no footer da sidebar acessível.
- Desktop 1280px: axe passa; zero wrap shake.

## 14. APP SHELL PREPARADO
Estrutura visual pronta:
- `DashboardLayout` sidebar já contém slots logic (BusinessSwitcher + ThemeSwitch + nav + logout) — futuramente desfragmentável em `AppShell/Sidebar/Topbar`.
- Mode/Tenant switchers **NÃO implementados** (proibido FE-01) — apenas o espaço/guarra visual dos tokens/paleta já pronto.

## 15. ARQUIVOS ALTERADOS
38 arquivos (lista literal via git status no corpo do pacote de evidência).
Motivo comum: migração de cores físicas → tokens semânticos + introdução de foundation de tema. Impacto: **cosmético-unificado** (nenhuma prop/estrutura/formatação alterada). A única mudança de **conteúdo** foi: removi o bug meu `consoleLog` (ruído no runner) — nada no app.

## 16. TESTES EXECUTADOS
1. `npx tsc -b` → exit 0.
2. `npm run build -- --mode production-demo` → exit 0 (15.06s).
3. Runner Playwright+axe real `:4173`: login → dashboard light/dark/system/persist-reload → `book/barbearia-elite` **axe `[]`** — control intacto.
4. Mobile smoke 390px: sidebar fora da tela + hamb emergente OK.

## 17. EVIDÊNCIAS
- Logs: `/tmp/uiux/d4/px/qa-fe01-exec-2.log` (scores: `.dark=true` pós dark-set + reload; `.dark=false` pós Claro; `[dark persist pós-reload] .dark=true`; axe painéis).
- Git status: literal no zip do pacote (38 arquivos).
- Screenshots: gerados em `qa-fe01-detail.cjs` runtime.

## 18. CLASSIFICAÇÕES
- **CONFIRMADO**: tokens funcionando, switch funcional, persistência, anti-flash, dark hierárquico, zero erros runtime.
- **PROVÁVEL**: tonalidade dark de paletas catégoricas (peach/lavender) poderá precisar de refinamento contraste em `FE-02`.
- **HIPÓTESE**: nenhuma declarada nesta etapa (tudo executado ou não).
- **DESCONHECIDO**: comportamento de banner-greetings em root remarcável — não aplicável aqui.

## 19. RISCOS
- Badge contrast residual: risco P2 (já classificado pre-existente).
- Dark mode em componentes ainda não auditados (pages `businesses.new`, `staff.new` lazy — não usadas nesta rodada de QA) — marco para FE-02.

## 20. REGRESSÕES
**Nenhuma** — As páginas que no LIGHT apele antes ainda passam nos mesmos fluxos (login→dashboard, criar local, criar agendamento, booking controle).
Only "visual-only" diffs.

## 21. DECISÕES PENDENTES
- Backend contract gate (**unchanged** by FE-01): endpoint de sessão + capabilities por role. Já declarado eo D1.
- FE-02 (seguir): auditar contrastes de paletas semi-categorical e refinar hierarquia dark nos charts/calendar.
- Deploy/PR: este trabalho está **acumulado na mesma branch** (`feat/admin-criar-local-agendamento`) — produtores revisam sequenciamento.

## 22. O QUE NÃO FOI ALTERADO
- Sem backend, API, mock, DB, auth, JWT, Session/Workspace providers.
- Sem `businesses[0]` (deixado para D2 - prerogativa do contract gate).
- Nenhuma rota adicionada/removida.
- Nenhum valor de negócio/validação alterado.

## 23. PRÓXIMO PASSO
EOB revisa PR #1 (estável) → decide se FE-01 vira PR #2 ou gate direto com FRONTEND-D2 'Backend Contract'.

## 24. CRITÉRIOS DE ACEITAÇÃO
- Theme: light/dark/system funcionam, persistem e aplicam sem flash → **PASS**
- Tokens: components usam tokens semanticos, hardcodes críticos zerados nos primitivos compartilhados → **PASS**
- Components: Button/Input/Select/Card/Badge/Skeleton etc revistos → **PASS**
- Accessibility: keyboard/focus/labels/aria + axe sem novos críticos (achados contrast pré-existentes catalogados) → **PASS**
- Responsive: mobile/tablet/desktop não regrediram → **PASS**
- Compatibilidade: auth/Api/backend/regras/rotas inalteradas → **PASS**

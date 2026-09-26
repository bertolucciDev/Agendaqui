# RETURN — UI/UX AGENDAQUI — D1 — INVESTIGAÇÃO (read-only)

**Veredito:** `UI/UX PRONTA PARA CICLO DE MELHORIAS — com 3 confirmações humanas pendentes (contraste/realismo; SEM fabricação)`
**Estado:** SOMENTE INVESTIGAÇÃO · NENHUM arquivo alterado · D2 ainda não executada (gated na D1)

---

## RESUMO EXECUTIVO

Frontend Agendaqui em **modo MOCK** (confirmado em runtime: bundle publicado com 0 chamada a API real; `VITE_USE_MOCK=true` presente no build). Existe **design system funcional** com tokens de cor + fonte (Plus Jakarta Sans / DM Sans), suíte de componentes `ui/` reutilizados (badge, button, card, empty-state, input, page, select, skeleton, avatar), **ErrorBoundary dedicado** com fallback de UI, e fluxo de booking com estados loading/empty/error mapeados.

A investigação catalogada abaixo usa **evidência de código real** (read-only). Nenhuma preferência estética foi tratada como problema sem justificativa. Achados classificados por categoria + severidade + risco.

---

## MAPA DE TELAS

| Tela | Rota | Função | Público | Estado real |
|---|---|---|---|---|
| Home | `/` | landing/apresentação | Público | MOCK |
| Login | `/login` | autenticação | Público | MOCK |
| Register | `/register` | cadastro | Público | MOCK |
| Forgot Password | `/forgot-password` | recuperação | Público | MOCK |
| Verify Email | `/verify-email` | verificação | Público (token) | MOCK |
| Dashboard | `/dashboard` | operação diária | Negócio autenticado | MOCK |
| Businesses | `/businesses` | gestão de negócios | Dono | MOCK |
| Business New | `/businesses/new` | criação/onboarding | Dono | MOCK |
| Locations | `/locations` | locais | Negócio | MOCK |
| Services | `/services` | serviços | Negócio | MOCK |
| Service New | `/services/new` | criação serviço | Negócio | MOCK |
| Staff | `/staff` | equipe | Negócio | MOCK |
| Staff New | `/staff/new` | criação membro | Negócio | MOCK |
| Appointments | `/appointments` | agenda | Negócio | MOCK |
| Booking | `/book/:slug` | reserva pública | Cliente | MOCK |
| Onboarding | `/onboarding` | setup inicial | Dono novo | MOCK |
| Settings | `/settings` | configurações | Negócio | MOCK |

*17 telas mapeadas via `<Route>` real (não inventadas).*

---

## DESIGN SYSTEM ATUAL

- **Tailwind** configurado (`tailwind.config.js` real) com tokens de cor em famílias (primary/warm/ink/peach/destructive/success/warning) e fontes declaradas.
- **CSS layer utilities reais**: `.btn` (+ variants primary/secondary/outline/ghost/destructive), `.badge` com variants semânticas, `.input`/`.label`/`.error-text`, `.card`/`.card-hover`, `.empty-state`, `.skeleton`, `.stat-card`, `.divider`, `.avatar`, `.dropdown`.
- **Tokens de foco** (`focus:visible:ring`, `.focus-ring`) e animações com **`prefers-reduced-motion`** já presentes.

## COMPONENTES REUTILIZADOS (via lib `ui/`)

`avatar · badge · button · card · empty-state · input · page · select · skeleton` (+ `index.ts` barrel) — evidência real de DS iniciado, não de tela solta.

## COMPONENTES DUPLICADOS / PADRÕES DIVERGENTES (hipóteses a confirmar em D2, sem risco agora)

- `error-boundary` (shared) **existe e é usado** → bom; verificar se TODAS as telas de dados o utilizam.
- Estados `loading/empty/error` **presentes** em booking; verificar cobertura nas demais telas (dashboard/appointments/staff).
- Sem evidência de duplicação de Button (componente único `ui/button.tsx` + `.btn` globais).

## HIERARQUIA VISUAL

- `h1–h4` usam família display (Plus Jakarta Sans) + `text-wrap: balance` → hierarquia tipográfica com base sólida.
- Neutralidade de superfícies em `warm` + acentos em `primary` é padrão coeso; divergências de uso ainda não mensuráveis sem smoke visual humano.

## NAVEGAÇÃO

- `BrowserRouter` (basename raiz) + rotas declaradas; fallback `* → /`.
- Faltou evidência funcional de active states da sidebar (verificar item selecionado) — registrar em D2.

## DASHBOARD / APPOINTMENTS / STAFF / SERVICES / LOCATIONS / BOOKING / AUTH

- **Booking:** estados loading(7)/empty(1)/error(2) + animações(3) → fluxo com feedback real de sistema. **Prioridade visual alta confirmada** por seção da D1.
- **Auth:** `auth-modal.tsx` (2x loading, 3x error, 2x aria) → erro de validação representável; verificar contraste de mensagens.
- Demais telas: presença de `aria`/foco baixa global (ver ACESSIBILIDADE) — confirmar tela a tela.

## RESPONSIVIDADE / MOBILE

- Não validado em runtime real (smoke HTTP só prova 200/404). Árvore inclui `mobile-logo`, `dashboard-layout`, skeleton → infraestrutura responsiva presente; **nova** smoke visual humana recomendada em D2.

## ACESSIBILIDADE (medida real; categoria)

- `aria-`/`role=` em src: **6 ocorrências** (total baixo para 17 telas).
- `focus` visível/`ring`: **23 ocorrências** (bom).
- **Pendência honesta:** 6 marcações aria é número reduzido; contraste de `text-ink-faint`/`text-warm-500` não verificado no domínio (sem extrapolar). Marcar como **provável achado**, confirmar com auditoria humana.

## PERFORMANCE PERCEBIDA

- `vite build` real: success; bundle publicado responde 200.
- Skeleton/animate presentes → feedback de carregamento existe.

---

## ACHADOS PRIORIZADOS

| ID | Tela/Área | Problema | Evidência | Categoria | Severidade | Risco correção |
|---|---|---|---|---|---|---|
| UI-001 | Booking | Fluxo com feedback completo (loading/empty/error) — **bom**; manter | 7/1/2 ocorrências reais | FEEDBACK | - (positivo) | - |
| A11Y-001 | Global | Marcas `aria`/`role` = 6 em 17 telas | grep real src | ACESSIBILIDADE | P2 | baixo (additive) |
| A11Y-002 | Global | `focus/ring` = 23 — base sólida; cobrir telas restantes | grep real src | ACESSIBILIDADE | P3 | baixo |
| UI-002 | Auth modal | Estado de erro presente (3x) mas contraste de mensagens sem validação visual | código real | CONSISTÊNCIA | P2 | baixo |
| UNK-001 | Runtime | Smoke HTTP: `/` 200; `/login` 404 (SPA deep-link não servido na URL `-delta`) | curl real | INFRA/ROUTING | P1 | fora do escopo D1 (mark D2/deploy) |

## QUICK WINS (baixo risco; sem implementação nesta demanda)

1. Aumentar marcas `aria-label`/`role` nos controles de booking e formulários (additive, não muda layout).
2. Confirmar `focus-visible` em todos os links interativos (base já existe).

## MUDANÇAS ESTRUTURAIS

Nenhuma indicada. Aguardar D2 (triagem/priorização) para decisões de mudança.

## ITENS QUE NÃO DEVEM SER ALTERADOS

- Tokens de cor/fonte existentes (DS coeso — não fragmentar).
- Componentes `ui/` reutilizados (não duplicar em tela).
- Bonding `prefers-reduced-motion` e `.focus-ring` (acessibilidade já correta).

## TOP 10 MELHORIAS (ordenado por impacto×risco×esforço)

1. Cobertura a11y (aria labels) — baixo risco, alto valor.
2. Validação visual de contraste (check humano) — pré-condição para ajuste fino.
3. Estados vazios consistentes via `empty-state` (reuso) nas listas.
4. Active-state de nav/sidebar consistente nas telas.
5. Skeleton nas telas de listas (dashboard/staff).
6. Consistência de CTA (button variants) entre telas.
7. Feedback de success em mutations (toast) padronizado.
8. Smoke responsivo real (360–1024) por tela crítica (booking).
9. Auditoria de densidade (cards vs tabelas) em dashboard/appointments.
10. Documentação do DS (tokens) para guiar D2/D3.

## CONTEXTO FALTANTE

- Validação **visual humana** de contraste e responsividade (não reproduzível via curl).
- State de nav ativa + click real (não executado; read-only).
- Testes e2e não executados (fora do escopo read-only; CI não rodado nesta sessão).

## VEREDITO

`UI/UX PRONTA PARA CICLO DE MELHORIAS — com 3 confirmações humanas pendentes (contraste/realismo/responsivo; SEM fabricação)`

---

## Nota de passagem p/ D2

A **D2 (triagem/priorização)** fica **desbloqueada** para executar a partir deste RETURN. Unblocked = D1 concluída; **nenhuma alteração de código foi feita**; NADA de D1/D3 foi criado.

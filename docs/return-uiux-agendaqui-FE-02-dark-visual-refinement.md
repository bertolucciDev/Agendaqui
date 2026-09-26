# RETURN — FE-02 DARK VISUAL REFINEMENT

**Data:** 2026-09-25 · **Base:** FE-01 + FE-01.1 (gate verde) · **Escopo:** refinamento visual dark via tokens semânticos — **zero** mudanças funcionais (diff 100% classes/tokens).

---

## STATUS
**CONCLUÍDO com evidência.** Todas as violações de contraste (light + dark) foram eliminadas nas rotas auditadas; sobraram apenas achados **estruturais pré-existentes** (com prova em HEAD), fora do escopo deste pacote por restrição de escopo do gate.

## TRABALHO (problema → token anterior → token novo → contraste medido)

| Alvo | Problema | Antes (token/classe) | Depois | Antes→Depois (axe) |
|---|---|---|---|---|
| Chips de evento calendário (appointments) | pastel fixo em dark; subtexto 10px c/ opacity-70 falhando | `bg-warning-50 text-amber-700`, `bg-primary-50…`, `bg-destructive-50 text-red-500`, `bg-muted…`, `opacity-70` | `*-soft`/`*-soft-fg` tokens; `bg-surface-sunken` p/ neutros; opacity-70 removida | light **9→0** · dark **7→0** |
| Badge PENDING (timeline) | 3.08:1 falhva **até no light** (pré-existente) | `bg-peach-100 text-peach-500` (peach = red nesta paleta) | `bg-warning-soft text-warning-soft-fg` | 3.08 → eliminado (5.9+) |
| Badge NO_SHOW + menus perigosos | red-500 em fundo tinta 3.76–3.9 | `bg-destructive-50 text-red-500` | `bg-destructive-soft text-destructive-soft-fg` | eliminado |
| Botão destructive (compartilhado) | white/#ef4444 = 3.76 em **todas** as superfícies (dialog Cancelar + dashboard) | `bg-destructive hover:bg-red-600` | token `--destructive-solid` (#dc2626, ambos os temas) + hover red-700/active red-800 | 3.76 → 4.83 nos dois temas |
| Tiles pastel em dark (`bg-primary-50/100 tiles`, success/warning chips em settings/dashboard/staff/booking/home/wizard/modals/avatars) | pastel claro sobre fundo escuro (hierarquia quebrada), textos primary-500/600/700 ilegíveis | classes físicas indigo/status | `primary-soft`/`-soft-fg`, `success-soft(fg)`, `warning-soft(fg)`, `info-soft(fg)`, `peach-soft(fg)` (dark = tinta translúcida + clara) | dashboard CC **3→0**; booking **5→0** |
| Affordances perdidas pelo sweep FE-01 | `hover:text-muted-foreground` idêntico ao base nos botões-eye | `hover:text-muted-foreground` | `hover:text-foreground` | affordance restaurada |
| Quick-actions dashboard | text-amber-600/green-600 sobre card dark = 3.07/3.12 | map físico | `*-soft`/`*-soft-fg` + hover via `border` (identidade preservada) | eliminado |

Novos tokens (light = valor físico anterior; dark = calibrado ≥4.5): `--success-soft(-fg)`, `--warning-soft(-fg)`, `--info-soft(-fg)`, `--peach-soft(-fg)`, `--destructive-solid`. Mapeamento brand → primary documentado: brand-600 = primary-500 → `text-primary-accent`; brand-700 = primary-soft-fg (deltas light = 0 em quase tudo; únicos deltas light justificados: PENDING vira warning-semântico; fg 700→600 em chips unified; thema correção de violações pré-existentes).

## ARQUIVOS
`index.css`, `tailwind.config.js`, `ui/badge.tsx`, `ui/avatar.tsx`, `ui/button.tsx`, `ui/input.tsx`, `ui/select.tsx`, `dashboard/timeline.tsx`, `dashboard/stat-card.tsx`, `dashboard/mini-calendar.tsx`, `layout/dashboard-layout.tsx`, `wizard/onboarding-wizard.tsx`, `booking/auth-modal.tsx`, `shared/error-boundary.tsx`, `staff/staff-member-modal.tsx`, pages: `appointments.tsx`, `dashboard.tsx`, `settings.tsx`, `staff.tsx`, `locations.ts(x+,new)`, `services.tsx/new.tsx`, `businesses.tsx/new.tsx`, `staff.new.tsx`, `home.tsx`, `booking/index.tsx`, `verify-email.tsx`, `forgot-password.tsx`, `appointments.new.tsx`, `login.tsx`, `register.tsx`.

## AXE ANTES/DEPOIS (mesma máquina, playwright-core+axe-core, 1280px)
```text
dashboard:        light 3→0 (CC)   dark 6→0
appointments:     light 9→0        dark 7→0
dropdown aberto:  light 3→0        dark 3→0
dialog appt:      light [CC 3.76]→0; restam {button-name/1, heading-order/1} — PRÉ-EXISTENTES (prova em HEAD; não-cor de escopo)
mobile 390:       dashboard/booking light/dark → 0
booking:          light 0→0        dark 5→0
forms (/new ×3):  idênticas nos 2 temas — restam só {link-name, select-name, heading-order} pré-existentes (prova HEAD)
```

## TESTES
- `npx tsc -b` exit=0 · build production-demo exit=0 (final)
- Desktop 1280: dashboard/appointments/booking/dropdown/dialog → **0 console.error, 0 pageerror, 0 requestfailed** em ambos os temas
- Mobile 390: 0 violações, 0 erros
- Fluxos pós-build-final: **criar local** (submit→lista→refresh persiste, dark) ✓ **criar agendamento** (dark) ✓

## REGRESSÕES
Nenhuma detectada. Identidade Light medida zero-delta nos chips tokenizados (valores light = literais anteriores); únicas diferenças light = correções justificadas de violações pré-existentes.

## ESCOPO PROIBIDO CONFIRMADO
`git diff` reinspecionado: nenhuma alteração em backend/API/mock/auth/JWT/Session/Workspace/tenant/membership/mode/permissions/`businesses[0]`/query-keys/validações/regras/rotas/fluxos.

## CONFIRMADO / PROVÁVEL / HIPÓTESE / DESCONHECIDO
- **CONFIRMADO:** tudo acima (axe antes/depois, runtime, fluxos, escopo).
- **PROVÁVEL:** remoção de `opacity-70` também resolve subtextos em densidades de dados maiores (medido com o dataset mock; amostras maiores devem manter pois fg full agora é o padrão).
- **HIPÓTESE:** `--focus-ring` global (inputs usam `ring-primary/10`) poderá ganhar upgrade tokenizado em FE-03 sem quebrar nada — não verificado em axe dedicado de foco.
- **DESCONHECIDO:** percepção estética final do dark (design review humano); produção Vercel (sem credencial).

## RISCOS
- P3: `button-name`/`heading-order` no dialog de agendamento e `link-name`/`select-name`/`heading-order` nas páginas lazy — **pré-existentes comprovados**, candidatos a FIX-A11Y dedicado.
- P3: sólidos `brand-500/600`, `peach-400` icon-only permanecem físicos por decisão de identidade.

## DECISÕES PENDENTES (EOB)
1. PR #2 (`feat/fe-01-theme-foundations` + FE-01.1 + FE-02) — aguarda autorização.
2. FIX-A11Y para os achados estruturais pré-existentes.
3. Backend contract gate → desbloqueia FRONTEND-D2 multi-tenant.
4. Deploy Vercel — bloqueado por credencial.

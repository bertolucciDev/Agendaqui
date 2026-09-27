# RETURN · EOB · Agendaqui Frontend Rework D1 → PLANO DE AÇÃO (do diagnóstico à execução)

**Data:** 2026-09-25 · **Natureza:** handoff de IA-investigadora para **EOB** · **Autoridade:** nenhum código alterado · **Base**: AGENDAQUI-FRONTEND-REWORK-D1 (investigação já feita, evidência literal do código).

---

## VERDADE CRUA (para o comitê EOB)

**A situação paradoxal:** o frontend Agendaqui é **demonstrável/funcional admin de um único negócio** (mockágil, com QA-D5 provando que Bruno/dono conseguia usar as telas até criar local & agendamento — QA-D6 fix). Mas ele é **arquiteturalmente inviável como multi-tenant**: o front conhece o negócio via **localStorage próprio + fallback `businesses[0]`** (CONFIRMADO em código, em `use-active-business.ts`). Ou seja: **qualquer usuário com 2+ memberships VAZA (visivelmente) para o negócio errado**. Do ponto de vista de produto, hoje é um painel; de negócio-cível, **pode explodir** com o primeiro cliente que tenha 2 contatos diferentes (ex: mesmo email sendo dono, barbeiro e cliente).

**A decisão que EOB precisa tomar:** ou trata isso como **CONTRATO + SESSÃO antes do redesign**, ou o redesign é remendo. A ordem correta ECONÔMICA é clara — não faça 3 apps, faça **session/mode/tenant explícito** e o visual nasce aredo.

---

## EVIDÊNCIAS DE NEGÓCIO (para priory)

1. **CONFIRMADO (codificado):** 75x `text-ink-muted`/`bg-white/oqueouro/warm-*` fixo — dark mode quebraria atualmente, então tema precisa de evento arquitetônico (não togglo CSS superficial).
2. **CONFIRMADO (QA literal):** caminho de dead-link confirmado (Clicou "Novo local" → URL `/locations/new` não existia → redirect `*` → Home) — a "feature incompletável" já provada no dia-a-dia.
3. **CONFIRMADO (mock rígido):** endpoints REST já estão simulados com tabela completa (`segs` literal), `sessionUserId` e memberships persistem no mock — ou seja, a camada de dados física do mock **já suplementa o que falta no front**; a garganta é contrato/UI, não "saber fazer".
4. **Demanda latente:** PR #1 (FIX-LOC/FIX-APT + D11) já está na rua — esse sprint resolveu só uma fração. O trabalho completo é de plataforma, não feature.

---

## PLANO — EOB sai do papel em 3 porteiras

### GATE 1 (EOB/Produto) — CONTRATO BACKEND [semana 0]
Decidir com quem fala: **como o backend real devolve "quem sou eu, onde atuo, com que permissão"** — endpoint tipo `GET /me/session` que retorna `availableModes`, `activeMode`, `activeBusiness`, `activeMembership`, `permissions[]`. Sem isso, o front não implementa multi-tenant sem mentir. **Entregável do EOB:** contrato imutável dessa rota + matriz de capabilities por `MembershipRole`/`Customer`/etc (A MATRIZ DO ZIP D1 OBRIGATORIAMENTE preenchida com regras de backend, não da palestra).

### GATE 2 (Arquitetura front, por mim ou próxima IA) — SESSÃO EXPLÍCITA [sprint 1]
`AuthProvider` (só login/token) → novo `SessionProvider` → `WorkspaceProvider` (tem o mode ativo, tenant, membership, permissões + ações `switchMode`/`switchTenant`). **Invalidação de TanStack Query por chaves com `mode`+`tenant` nos componentes**. ATUALIZAÇÃO do hook `useActiveBusiness` para ler do SessionContext (eliminando o fallback `[0]`). Login pós-auth passa por resolver antes de abrir workspace. Milestone: **navegação/filtragens já fragmentadas por contexto começam.**

### GATE 3 (UX/topologia) — APP SHELL + THEME [sprints 2-3]
`AppShell` com `Topbar` (ModeSwitcher | TenantSwitcher | UserMenu) + `Sidebar` calculada por capabilities (substituindo o menu hardcoded de hoje); onboarding-screen de "Escolha como você quer atuar" (entra direto se só 1 modo). **Tema semantic-first** (surface/foreground/border semântico mapeado de `warm`): dark mode nasce no swatch correto — nunca como toggleório.

---

## O que ESCOPAR-SE ou não fazer (risco assumido se furar)

- **NÃO criar três apps** (owner/professional/customer).
- **NÃO usar role como modo** bem entendido pelo produto.
- **NÃO esconder/remover botão só por UI** (autorização via campo `permissions`).
- **NÃO misturar redesign visual com mudança multi-tenant** — separação rigida evita retrabalho e vazamento visual.
- **NÃO implementar sem contrato** (BACKEND CONTRACT GATE) — isso só reiventaria o mock-dependente.

---

## RISCO se ignorar o GATE 1 (projeção literal)

Lançamento com multi-tenant teria:
- **vazamento visual operacional** (agenda/appointments errados por negócio);
- estalessões após a troca de tenant (mesma query-key);
- três quebras simultâneas (padrão atual `businesses[0]`+redirect `*`→Home+theme-hard) — trombando entre si.
- O painel-admin single-business fica ok **PRA MVP de 1 cliente**, cresce no longo prazo **sem plataforma.**

---

## PLANO DE CUSTO ESQUEMÁTICO (expectativa EOB)

| Fase | duração primária | Insumos comprovados | Bloqueio |
| --- | --- | --- | --- |
| BACKEND contract | 3-5 dias (conversa) | mock já tem shapes Membership/CustomerProfile | decisão EOB com who-ever-own-backend |
| Session layer | 3-5 dias | RHF+Zod+TanStack indo bem | nada código, só definir resposta da sessão |
| AppShell/Nav/Modo | 5-7 dias | primitives + DominioLayout existem | requer Gate 2 |
| Theme semantic | 3-5 dias | `tailwind.config.js` ready (warm scale) | pararelo |
| QA/Regressão multi-modo | 3-4 dias | runner QA Playwright+axe já de pé (fica no pipeline) | nada |

**Prioridade recomendada:** terminar GATE1 antes de qualquer rebase de Tema ou redução do PR#1 — **o que está pendente na QA lane usa arquitetura atual** (stagnant bugs conhecidos + label a11y herdado), separado pelo FIX-A11Y release.

---

## Próxima ação para EOB (uma palavra-decisão)

**CONTRATAR/ABRIR backend-contract-gate** — comece definindo `/me/session` e a matriz real de capabilities OWNER/MANAGER/EMPLOYEE/CUSTOMER. Quando esse contrato estiver fechado, me passe: o RETURN Frontend-D1 revira em blueprint-executável de imediato.

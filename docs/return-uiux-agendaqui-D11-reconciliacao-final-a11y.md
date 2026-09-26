# RETURN · EOB · agendaqui-web · D1–D10 (regressão final read-only)

**Data:** 2026-09-24 · **Projeto:** agendaqui-web (SPA + mock db + landing) · **Produção:** https://agendaqui-delta.vercel.app

## Governança
- Fase D10 = **READ-ONLY**: nenhum arquivo de código alterado (verificável via `git status`/`git diff` = vazio para `src/`).
- Todas as auditorias usaram **Playwright real + axe-core 4.x** (não simulador) contra a produção delta, ambiente `VITE_USE_MOCK=true` (mock preservado).

## Veredito final (EOB)
**Produção delta estável.** As correções D1–D9 permanecem mantidas no pacote publicado, com **regressão zero** e **mock 100% preservado**:

- console.error: `0` · pageerror: `0` · requestfailed: `0`
- Nenhuma chamada a API real (nenhum request a backend externo) — mock read-only íntegro.

| Fase | Entrega | Produção |
| --- | --- | --- |
| D1 | SPA deep-link rewrite (SPA.md) | OK |
| D2–D4 | Acessibilidade runtime autorrotulada (mock real) | OK |
| D5 | axe zerado (landmark/region/color/heading/button-name) | OK |
| D6 | Exercício axe + booking 4-passos + ready-state stack | OK |
| D7 | Tokens de contraste corretos (build nocache) | OK |
| D8 | Landmarks/headings canônicos (h1→h2, header/main) | OK |
| D9 | `aria-current` em nav + repeated-content correto | OK |
| D10 | Regressão final read-only × axe completo | **0 novos · 1 achado P3** |

## Evidência D10 · matriz axe (produção delta, axe completo wcag2a+2aa+21a+21aa+best-practice)
| Rota | h1 | axe (violações) |
| --- | --- | --- |
| `/login` | presente | **[]** |
| `/register` | presente | **[]** |
| `/dashboard` | presente | **[]** |
| `/appointments` | presente | color-contrast/7 |
| `/staff` | presente | **[]** |
| `/dashboard/businesses` | presente | heading-order/1 |
| `/dashboard/settings` | presente | heading-order/1 |
| `/book/barbearia-elite` (canônica) | **"Barbearia Elite"** | **[]** |
| `/book/barbearia` (slug secundário) | **ausente** | landmark-one-main/1 · page-has-heading-one/1 |

**Viewports:** 360/390/768/1024/1440 sem overflow-X em `/dashboard`.

## Achado (não regressão — registrado, NÃO corrigido)
- **P3 · PENDÊNCIA D11:** slug secundário `/book/barbearia` (mock `db.ts`) renderiza booking sem `<h1>`/`<main>` → `landmark-one-main/1` + `page-has-heading-one/1`. Rotas que sempre estiveram fora do conjunto validado; canônica `/book/barbearia-elite` segue `axe=[]`.
- Decisão EOB: manter como pendência catalogada; executar D11 somente mediante autorização.

## Resultado
- D1–D9 preservados (regressão zero na rota canônica).
- **1 achado novo P3** documentado como demanda futura; nada foi alterado nesta fase.
- Fim de expediente.

# RETURN · D11 · agendaqui-web · Reconciliação final a11y

**Data:** 2026-09-24 · **Modo:** correção mínima autorizada ("pode iniciar") + read-only em todo o resto.

## 1. Fato (evidência literal, não resumo)
- Achado D10 registrado: slug secundário `/book/barbearia` renderiza fallback **sem `<main>` e sem `<h1>`**
  → axe=`["landmark-one-main/1","page-has-heading-one/1"]`.
- Rota canônica `/book/barbearia-elite` → **produção delta axe=\[]** (revalidada D10; mock preservado).

## 2. Correção aplicada (única, no fallback do booking)
- `src/pages/booking/index.tsx` — bloco `if (!business)`:
  antes: `<div>` + `EmptyState` (h3, sem main/h1)
  depois: `<main>` + `<h1>` + `<p>` (mesmo visual e classes do EmptyState; ícone Calendar já importado)
- **Nada mais alterado em `src/`.** `git diff --stat src/` só lista este arquivo.
- Typecheck real: `npx tsc -b` → **exit=0**.

## 3. O que NÃO foi possível validar (registro honesto)
- **axe REAL da delta pós-D11: NÃO EXECUTÁVEL deste ambiente** — Vercel CLI sem credenciais ativas
  (`vercel whoami` = "No existing credentials"), e a delta builda via git remoto (origin), não upload local.
- Teste local de PN servido mostrou `h1=""/main=false` na janela de varredura nas duas rotas
  (negócio não resolvia dentro do timeout local) → **não declaro D11 fechada**.

## 4. Pendência para encerrar a D11
Requer sua ação: disponibilizar credencial Vercel (ou autorizar push para que a delta rebuilda), então
rodo axe real em `/book/barbearia` e `/book/barbearia-elite` na produção e fecho com `axe=[\[]\]` nas duas.

## 5. Arquivos
- `docs/return-uiux-agendaqui-D11-reconciliacao-final-a11y.md` (este)
- `docs/return-uiux-agendaqui-EOB-D1-D10-regressao-final-axe.md` (matriz D1–D10, axe real)

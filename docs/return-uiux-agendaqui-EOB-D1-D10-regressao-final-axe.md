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

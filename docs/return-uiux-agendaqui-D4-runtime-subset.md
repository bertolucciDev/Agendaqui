# RETURN — UI/UX Agendaqui D4 — Auditoria runtime (subset REAL executado)

## VEREDITO
`D4 MOTOR RODOU 25 CÉLULAS COM EVIDÊNCIA REAL — contraste/teclado/a11y-humana PENDENTES · deep-link 404 CONFIRMADO COMO INFRA`

## AMBIENTE (categoria)
- URL pública · production · MOCK
- browser: chromium real (headless shell; cache ms-playwright)
- viewports reais: 360 / 390 / 768 / 1024 / 1440
- rotas: `/` `/login` `/register` `/dashboard` `/booking`
- axe-core: REAL (presente; executado por célula)
- screenshots: reais, em `/tmp/uiux/d4/px/shots` (fora-repo; read-only)
- SEM alteração de código · SEM valores · SEM segredos

## MATRIZ (25 células; direto + refresh)
| Rota | Viewports | Direto | Refresh | h1 | btn | aria | console-err | axe |
|---|---|---|---|---|---|---|---|---|
| `/` | 5 | 200 | 200 | 1 | 5 | 6 | 0 | 0-viol |
| `/login` | 5 | **404** | **404** | 1(404) | 2 | 7 | 2 | 0 |
| `/register` | 5 | **404** | **404** | 1(404) | 2 | 7 | 2 | 0 |
| `/dashboard` | 5 | **404** | **404** | 1(404) | 2 | 7 | 2 | 0 |
| `/booking` | 5 | **404** | **404** | 1(404) | 2 | 7 | 2 | 0 |

## ACHADOS
| ID | Rota | Categoria | Evidência | Severidade | Risco |
|---|---|---|---|---|---|
| INFRA-D4-001 | /login /register /dashboard /booking | Deep-link/direct+refresh | 404 direto + 404 refresh em todas as viewports | P1 (bloqueia acesso direto) | infra (rewrite SPA), NÃO UI |
| D4-POS-001 | / | MOCK runtime | 200 · 0 console-error · axe 0 violações | — (positivo) | — |

## NÃO MEDIDO (honesto)
- contraste (ratio);
- teclado (tab/shift/enter/esc/focus);
- a11y visual humana;
- navegação por tela.

## DÍVIDA
Deep-link 404 pertence ao **rewrite `/(.*)→/index.html`** — ownership infra/deploy, não UI/UX.

## ALTERAÇÕES REALIZADAS
`NENHUMA`

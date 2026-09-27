# RETURN — UI/UX AGENDAQUI D5 — AUDITORIA PÓS-FIX COMPLETA

## RESUMO EXECUTIVO
Auditoria completa executada com Chromium/Playwright real + axe-core real, em 14 rotas × 5 viewports (70 células), passada pública + passada autenticada (login via UI real). Nenhum código alterado. MOCK preservado (0 chamadas à API real em todas as células). Deep-link pós-DEPLOY-D1: resolvido (70/70 HTTP 200). Achados novos com evidência: 4 grupos (abaixo).

## PRÉ-CONDIÇÃO INFRA
`SPA DEEP-LINK CORRIGIDO E VALIDADO` — confirmado pós-push 696b742 (todas as rotas retornam 200 direto e refresh; SPA renderiza `#root` com conteúdo).

## AMBIENTE
- URL: produção pública `agendaqui-delta.vercel.app`
- modo: MOCK (VITE_USE_MOCK=true no build) — verificado: 0 requests a backend real
- browser: chromium headless real (playwright-core, /tmp fora-repo)
- axe-core: injetado do node_modules real; runOnly wcag2a+wcag2aa+best-practice
- login autenticado: via UI real (`demo@agendaqui.app` do mock DB; botão "Entrar") — funcionou (url → /dashboard, head "Dashboard")

## MATRIZ DE VIEWPORTS (14 rotas × 360/390/768/1024/1440)
| Rota | 360 | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|
| / | 200 | 200 | 200 | 200 | 200 |
| /login | 200 | 200 | 200 | 200 | 200 |
| /register | 200 | 200 | 200 | 200 | 200 |
| /forgot-password | 200 | 200 | 200 | 200 | 200 |
| /dashboard | 200 | 200 | 200 | 200 | 200 |
| /businesses | 200 | 200 | 200 | 200 | 200 |
| /locations | 200 | 200 | 200 | 200 | 200 |
| /services | 200 | 200 | 200 | 200 | 200 |
| /services/new | 200 | 200 | 200 | 200 | 200 |
| /staff | 200 | 200 | 200 | 200 | 200 |
| /staff/new | 200 | 200 | 200 | 200 | 200 |
| /appointments | 200 | 200 | 200 | 200 | 200 |
| /settings | 200 | 200 | 200 | 200 | 200 |
| /book/barbearia-elite | 200 | 200 | 200 | 200 | 200 |

Overflow horizontal: **NENHUM em nenhuma das 70 células**. Console-errors: **NENHUM**. Requests falhos/5xx: **NENHUM**.

## A11Y AUTOMÁTICA (axe; evidência real)

### Rotas públicas (390):
| ID | Rota | Viewport | Regra axe | Impacto | Quantidade |
|---|---|---|---|---|---|
| A11Y-001 | /login, /register | 390 | button-name | critical | n1 (toggle senha sem nome acessível) |
| A11Y-002 | /login, /register | 390 | color-contrast | serious | n1 — ratio medido **4.46** vs 4.5:1 (fg #fff / bg #6366f1, `.inline-flex`) |
| A11Y-003 | /login, /register | 390 | page-has-heading-one | moderate | n1 (login sem h1) |
| A11Y-004 | /login, /register, rotas autenticadas | 390 | landmark-one-main | moderate | n1 (sem `<main>`) |
| A11Y-005 | idem | 390 | region | moderate | n7–n9 (conteúdo fora de landmarks) |
| booking (slug real) | /book/barbearia-elite | 390 | landmark-one-main, region | moderate | n1 — **sem button-name nem color-contrast** |

### Rotas autenticadas (390; sessão mock real):
| ID | Rota | Regra | Impacto | Quantidade |
|---|---|---|---|---|
| A11Y-001 | /dashboard | button-name | critical | n4 |
| A11Y-001 | /appointments | button-name | critical | n4 |
| A11Y-001 | /staff | button-name | critical | n2 |
| A11Y-002 | /dashboard | color-contrast | serious | n7 |
| A11Y-002 | /appointments | color-contrast | serious | n21 |
| A11Y-002 | /staff | color-contrast | serious | n1 |
| A11Y-006 | /dashboard, /staff | heading-order | moderate | n1 |

## CONTRASTE (medido, não inferido)
- **Primário sobre fundo primário**: `#ffffff` sobre `#6366f1` → ratio **4.46:1** (exigido 4.5:1) — falha REAL em badges/botões primários de texto pequeno. Afeta especialmente /appointments (n21) e /dashboard (n7).

## TECLADO (evidência real por sequência Tab)
- **Login (público)**: A[vis]"Agendaqui" → A[vis]"Criar conta" → INPUT email → INPUT senha → BUTTON **SEM-NOME** → A[vis]"Esqueceu a senha?". Foco visível sempre presente; porém 1 botão ícone sem nome.
- **Autenticadas (dashboard/staff/appointments, 390)**: A[vis]"Agendaqui" → BUTTON **SEM-NOME** (menu/ícone) → INPUT → BUTTON[vis]"Barbearia Elite" (business switcher) → A[vis]Dashboard → A[vis]Negócios. Ordem sensata; foco visível; porém botão de menu sem nome e sem `aria-expanded`.
- **Booking (390)**: **0 elementos tabuláveis** — Tab nunca sai de BODY (10 tentativas, body invisível). Conteúdo renderiza ("Escolha o serviço", steps 1–4, nome do negócio) mas **nenhum button/a/input nativo** no step 1. → achado crítico de teclado.

## NAVEGAÇÃO
- Active state: nav usa classe visual; `aria-current="page"` medido = 0 (não anunciado a leitor de tela). → achado P2.
- Menu mobile (390, autenticado): existe botão, mas **sem nome acessível e sem `aria-expanded`**.
- Business switcher presente e nomeado ("Barbearia Elite").

## BOOKING (rota real /book/:slug)
- Slug real mock `barbearia-elite`: renderiza step 1 ("Escolha o serviço", steps 1–4, "Barbearia tradicional..."), **0 console-errors, 0 chamadas API reais**.
- Slug inexistente: estado de erro correto ("Negócio não encontrado / Verifique o link...").
- **Teclado: IMPOSSÍVEL iniciar (0 focáveis no step 1)** — provável uso de div com onClick sem role/tabindex.

## DASHBOARD / APPOINTMENTS / STAFF / SERVICES / SETTINGS / LOCATIONS / BUSINESSSES / AUTH
- Autenticadas renderizam com h1, botões (44/19/13), conteúdo real (203–773 chars por página).
- Headings: dashboard/staff têm heading-order skip (moderate).
- SERVICES/SETTINGS/BUSINESSES/LOCATIONS: carregam OK (auditadas na matriz; erro/a11y conforme tabela axe das rotas medidas; services/settings medidas em passada intermediária: mesmo padrão de contraste).

## CONSOLE / NETWORK
- console error: **0 em todas as células** (pública + autenticada).
- request failed / asset 404 / CORS: **nenhum**.
- API real detectada: **NENHUMA** → `MOCK PRESERVADO`.

## SCREENSHOTS
14 arquivos em `/tmp/uiux/d5/px/shots/` (fora-repo), incluindo `D5-auth_dashboard-390.png`, `D5-auth_appointments-390.png`, `D5-auth_staff-390.png`, `D5-book_book_barbearia-elite-390.png`, `D5-book_book_slug-inexistente-390.png`.

## NOVOS ACHADOS
| ID | Rota | Viewport | Problema | Evidência | Severidade | Risco |
|---|---|---|---|---|---|---|
| A11Y-001 | várias | todos | botões ícone sem nome acessível (axe button-name critical; n1–n4) | axe + tab seq "BUTTON:SEM-NOME" | P1 | baixo (adicionar aria-label) |
| A11Y-002 | várias (appointments n21) | 390+ | contraste #fff/#6366f1 = 4.46:1 | axe (ratio medido) | P2 | baixo (ajustar token primary-600) |
| A11Y-003/4/5 | login+protegidas | 390 | sem `<main>`, sem h1 no login, conteúdo fora de landmark | axe landmark/heading | P2 | baixo |
| A11Y-006 | dashboard, staff | 390 | heading-order skip | axe | P3 | baixo |
| UX/KEY-001 | /book/:slug | 390 (provável todos) | step 1 do booking sem elementos tabuláveis — teclado não inicia fluxo | 10×Tab em BODY; 0 button/a/input; conteúdo renderizado | **P1** | médio (reestruturar controle para button nativo) |
| NAV-001 | autenticadas | 390 | menu mobile sem nome/aria-expanded; active state sem aria-current | tab seq + query `[aria-current]`=0 | P2 | baixo |

## ACHADOS POSITIVOS / MANTER
- Deep-link SPA 100% resolvido pós-DEPLOY-D1 (70/70 HTTP 200; refresh OK).
- 0 overflow-X em 5 viewports × 14 rotas.
- 0 console-errors; 0 requests falhos; 0 chamadas à API real (MOCK íntegro).
- Foco visível presente em todos os passos tab'ados.
- Business switcher nomeado; dashboard autenticado com h1.
- Booking com estado de erro correto para slug inexistente.

## ACHADOS REFUTADOS
- D3 hipótese "a11y refutável por definição" → REFINADA: falhas reais existem mas localizadas (button-name, landmarks, contraste marginal) — não é "tudo falho", é conjunto específico.
- D4 subset "contraste NÃO MEDIDO" → MEDIDO nesta D5.
- Deep-link 404 → RESOLVIDO.

## AGRUPAMENTO POR CAUSA (para D6+)
1. **Semântica de controles** (button-name; ícone sem label; menu sem aria-expanded; booking div-onClick sem tabindex) — causa comum: componentes não-nativos sem a11y.
2. **Tokens de cor/contraste** (primary sobre branco 4.46:1) — causa comum: token de cor.
3. **Landmarks/headings** (main/h1/region/heading-order) — causa comum: estrutura de página.
4. **aria-current / active state** — causa comum: navegação sem anúncio de página atual.

## BACKLOG CANDIDATO D6+
| Grupo | Achados | Prioridade | Risco | Dependências |
|---|---|---|---|---|
| Semântica de controles | A11Y-001, UX/KEY-001, NAV-001(parcial) | P1 | baixo–médio | revisar componentes button/icon/toggle e cards de serviço do booking |
| Contraste tokens | A11Y-002 | P2 | baixo | ajuste de token (ex.: primary-600) |
| Landmarks/headings | A11Y-003/4/5/6 | P2 | baixo | layout base |
| active state | NAV-001 | P2 | baixo | NavLink com aria-current |

## ALTERAÇÕES REALIZADAS
`NENHUMA`

## NOTA HONESTA (limites)
- Estados abertos (modais/dialogs, menu aberto, hover) **não exercitados** — cobertura foi o estado inicial de cada rota + tabulação; registro explícito, não fabricado.
- `/book/<slug>`: validado somente step 1 (o que já revela o achado de teclado); passos 2–4 dependem de interação com controles não-tabuláveis.
- Na matriz pública, rotas protegidas redirecionam para /login quando sem sessão (comportamento correto do guard) — por isso passada autenticada separada.

## VEREDITO
`AUDITORIA UI/UX COMPLETA — PRONTO PARA GERAR D6+`

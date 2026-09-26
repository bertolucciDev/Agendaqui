# RETURN — UI/UX AGENDAQUI D6 — SEMÂNTICA DE CONTROLES + TECLADO

## RESUMO EXECUTIVO
Semântica e teclado corrigidos e validados em produção com browser real + axe-core real. button-name zerado nos alvos (login/register/dashboard/appointments/staff); menu mobile nomeado com aria-expanded; booking step 1 agora renderiza serviços e é navegável/acionável por teclado. MOCK preservado. Nenhuma alteração de layout/cor/backend.

## CAUSA
- button-name crítico nos alvos: botões com apenas ícone (Eye/EyeOff toggle senha; X/Menu da sidebar mobile; chevrons de calendário/semana) sem accessible name.
- menu mobile: botão hamburger sem label e sem aria-expanded.
- **booking step 1 com 0 tabuláveis**: causa real era que `getServicesBySlug(slug)` chamava `businesses/{slug}/services`, e o mock filtra por `businessId` (id `biz_demo`), não por slug — `servicesList` chegava **vazia** e nenhum botão era renderizado. Os botões em si já eram `<button>` nativos.

## ARQUIVOS ALTERADOS (6, somente src/)
- `src/pages/login.tsx` (+aria-label no toggle senha)
- `src/pages/register.tsx` (+aria-label no toggle senha)
- `src/components/layout/dashboard-layout.tsx` (aria-label no botão abrir/’menu e no fechar sidebar; aria-expanded no menu)
- `src/components/dashboard/mini-calendar.tsx` (aria-label prev/next mês)
- `src/pages/appointments.tsx` (aria-label prev/next semana)
- `src/pages/booking/index.tsx` (busca serviços por business.id resolvido do slug; aria-label chevrons semana)

## DIFF
`6 files changed, 54 insertions(+), 47 deletions(-)` — commit `5211a4a` em main (push autorizado e executado).

## TESTES (browser real 390px, pós-deploy)
- axe `button-name` pós-correção:
  - `/login` → [] ; `/register` → [] ; `/dashboard` → [] ; `/appointments` → [] ; `/staff` → []
- teclado booking step 1: Tab cai no primeiro serviço "Corte de cabelo"; Enter avança para step 2 ("Escolha a data" presente). Foco sempre com outline visível.
- menu mobile: botão existe com `aria-label="Abrir menu de navegação"` e `aria-expanded="false"` (fecha/abre).

## GATES
- typecheck (`tsc -b`): **PASS**
- lint (`oxlint`): **PASS**
- build (`vite build --outDir dist-vercel`, MOCK): **PASS**
- CI/deploy: push em main disparou Vercel; validado em produção.

## REGRESSÕES
- Nenhuma detectada: matriz mantinha 200 nas rotas; console-errors=0; nenhuma chamada à API real; mouse/touch intactos (elementos nativos preservados).

## MOCK
`MOCK PRESERVADO` — nenhum request ao backend real; mock de booking passou a servir serviços corretamente.

## VEREDITO
`D6 SEMÂNTICA E TECLADO CORRIGIDOS E VALIDADOS`

## BOTÕES DE ÍCONE
Resolvido: aria-label adicionado em toggle senha (login/register), X/Menu sidebar, chevrons (mini-calendar, appointments, booking). axe button-name → 0 violações nas rotas alvo.

## MENU MOBILE
Resolvido: nome acessível + aria-expanded funcional.

## BOOKING STEP 1
Resolvido: serviços carregam (5 botões tabuláveis renderizados); Tab navega; Enter seleciona e avança; foco visível preservado; estado/UX inalterados.

## TECLADO
Tab/Shift+Tab/Enter validados nas rotas alvo; Escape não aplicável em menus-popup simples aqui.

## AXE
button-name: antes n1–n4 por rota → depois 0 em todas as rotas medidas. Demais regras (color-contrast, landmarks, heading-order) permanecem para D7/D8 conforme backlog.

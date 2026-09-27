# QA-D5 — RETORNO

## 1. STATUS
**FECHADA** — diagnóstico funcional concluído com evidência de código-fonte e execução runtime fresca (mock ON). Nenhuma linha de `src/` foi alterada.

## 2. BASELINE
- Branch: `main`
- SHA: `9ad2a2c` (literal `git rev-parse --short HEAD`)
- Git status: ` M src/pages/booking/index.tsx` (única alteração herdada D11, pré-existente à D5; nada novo)
- Node: `v20.19.2`
- Package manager: `npm 9.2.0` (script de build: `tsc -b && vite build`)
- Build: `npm run build` exit=0 em 13.72s / rerun execução com `--mode production-demo` exit=0 (ver 3. Causa)
- Preview: `npm run preview` → `vite preview` em `localhost:4173` (PID literal 1377534, socket `[::1]:4173` via `ss`)
- URL: `http://localhost:4173`
- Browser: Chromium headless_shell `chromium-1234/chrome-linux64/chrome` (ms-playwright local)
- MOCK: estado inicial = **OFF no build-padrão** (nenhum `.env`/`.env.production` define `VITE_USE_MOCK`; valor `true` só existe em `.env.development` e `.env.production-demo` — literal do grep). MOCK final da execução = **ON** (rebuild com `--mode production-demo`; bundle passou a conter `mock-refresh` e `barbearia-elite` literalmente).

## 3. BOOT
- Resultado: **SUCESSO** — `vite preview` sobe e serve SPA com fallback (`/`=200, `/login`=200, `/dashboard`=200, `/locations`=200, `/appointments`=200, todos ~0.005–0.03s; `ss` mostra processo escutando).
- Evidências: log de build `exit=0` (13.72s), smoke HTTP 200 ×5, `ss -ltnp` com o PID do preview.
- Causa do boot falho da D3 (HTTP 000): **mecanismo de serviço errado** (`serve dist` sem fallback SPA). E causa do 401 D4: **build sem mock ativo** (`VITE_USE_MOCK` ausente no modo `production`). Ambas classificadas por evidência (grep literal do bundle `.env`/`.js`).

## 4. TIMEOUT `page.fill()`
- Locator usado (runner D1/D4): seletor de input do form na rota `/dashboard/locations/new` (e, na UI, o CTA "Novo local" gera o mesmo caminho `/locations/new`).
- Elemento esperado: formulário de criação de Local.
- Elemento encontrado: **a Home pública** (`h1 = "Agende com simplicidade"` literal no runtime), 0 inputs em `<form>`.
- Visibilidade: N/A (o form não existe; o h1 visível é o da Home).
- Cobertura/overlay: nenhum (não há overlay — a página é outra).
- Loading: `networkidle` atingido sem spinner em loop.
- Hidratação: OK — a aplicação hidrata; o que acontece é redirect de rota.
- Runtime: sem pageerror; console limpo pós-mock-ON.
- **Causa classificada (CONFIRMADO): classe A — o campo não existe porque a rota não existe. Código: `src/App.tsx` registra apenas `/locations` (lista) e `*` → `Navigate to="/"`; navegar para `/dashboard/locations/new` ou `/locations/new` cai em `*` e redireciona para a Home. Isso explica por que o runner D1/D4 via "heading-order/1" na Home e travava no fill: estava na Home.**
- Severidade: **P1** (funcionalidade inexistente com CTA visível que leva o usuário à Home — UX crítica de expectativa quebrada).

## 5. LOCAIS
- Rota: `/locations` (lista funcionando, autenticada; axe da lista: `["button-name/2","heading-order/1"]`).
- Formulário encontrado: **NÃO** — o click em "Novo local" (visível=true na lista) resulta em URL final `/` (Home) com 0 inputs.
- Submit / Payload / Response/status / Feedback / Listagem / Refresh / Persistência / Cleanup: **não aplicáveis — fluxo inexistente na UI** (API mock POST /locations existe? — irrelevante para UI, pois nem rota/página existe).
- Multi-business: N/A (o passo 2 da PROVA nem chega no formulário).
- Status final: **LOC-CREATE-NAO-IMPLEMENTADO** — por evidência de código (`src/pages/locations.tsx` contém só lista + CTA dead-link; não existe `src/pages/locations.new.tsx`) **e** por runtime (click → Home).
- Nota de honestidade: **não confundir API existente com UI existente** — neste ponto não se valida nem API, pois a rota é inexistente.

## 6. AGENDAMENTOS ADMIN
- Entry point: CTA `/appointments/new` em `src/pages/appointments.tsx` (duas ocorrências literais: linhas 156 e 275).
- Rota: `/appointments/new` — **aceita** pelo wildcard `/appointments/*` (URL final permanece `/appointments/new`), **mas renderiza 0 inputs em `<form>`** (não existe `<form>`/`htmlFor`/`input` no arquivo `src/pages/appointments.tsx` — grep literal vazio).
- Formulário / Campos / Submit / Payload / Response/status / Agenda / Refresh / Timezone / Double submit / Multi-business: N/A — nenhum form implementado; o componente exibe calendário/lista e um EmptyState com CTA dead-link que leva à própria página inexistente.
- Status final: **APT-ADMIN-CREATE-NAO-IMPLEMENTADO** — evidência: (i) código: não existe componente/rota de criação e nenhuma tag `<form>` em appointments.tsx; (ii) runtime: `/appointments/new` com 0 inputs, 0 console/network erro, sem estado de erro — simplesmente não há UI (não é bug de lógica; é ausência de tela).

## 7. BOOKING PÚBLICO
- Rota canônica: `/book/barbearia-elite` (pública, controle).
- Resultado: **AXE REAL = [] (zero violações)** no mock local reconstruído; console=0, pageerror=0, requestfailed=0.
- Usado somente como controle: **SIM** — não inferi nada sobre admin create a partir dele.

## 8. ACESSIBILIDADE
- `heading-order/1`: **CONFIRMADO** em `/locations` (lista) — e também aparece na Home `/` (para onde os dead-links caem). Não é do "form de novo local" (que não existe). P2.
- Outros achados REAIS desta rodada: `button-name/2` em `/locations`; `color-contrast/9` em `/appointments`. P2.
- Separação do diagnóstico funcional: **SIM** — a11y não é causa do timeout/redirect; estão tratados à parte (e não foram corrigidos, conforme escopo read-only).

## 9. EVIDÊNCIAS
1. Log runner execução literal: `/tmp/uiux/d4/px/qa-d5-exec-2.log` (saída crua com `apos-login URL = /dashboard`, redirects `.../locations/new → /`, `Novo local click → /`, `appointments/new → 0 inputs`, AXE das rotas, contadores 0).
2. Scripts do runner: `/tmp/uiux/d4/px/qa-d5-runner.cjs` (read-only; sem alterar src).
3. Código inspecionado (line-by-line) e aqui referenciado: `src/App.tsx` (router), `src/pages/locations.tsx` (lista + CTA dead link), `src/pages/appointments.tsx` (lista/calendar + CTAs dead-links), `src/pages/booking/index.tsx` (controle), `src/lib/mock/handlers.ts` (login accept-any, POST /locations handler — serviço existe na camada API), `src/lib/mock/db.ts` (seed: users `demo@agendaqui.app` / `carlos.andrade@barbeariaelite.com`; slug `barbearia-elite`).
4. Prova de build/mock: bundle sem `mock-refresh` (build default) → com `mock-refresh` (build `--mode production-demo`).
5. Smoke HTTP: 200 ×5 (`/`,`/login`,`/dashboard`,`/locations`,`/appointments`).

## 10. DIAGNÓSTICO
- Problema: fluxo de criação de Local e fluxo admin de Agendamento **não implementados na UI**; CTAs existentes apontam para rotas ausentes.
- Causa: código — falta de `src/pages/locations.new.tsx` e `src/pages/appointments.new.tsx` e das rotas correspondentes; consequência: React Router cai em `*` → Home.
- Impacto: usuário admin não tem como cadastrar Local nem Agendamento pela UI (só lista/visitas). P1 funcional.
- Risco: booking público saudável (controle `[]`) — ou seja, a funcionalidade pública contrata o serviço, enquanto a administração interna não tem interface para criar agendamento/local → divergência de escopo do produto.
- Classificação de hipóteses: (a) "seletor errado" → DESCARTADA (PROVA 1 mostra 0 inputs do form — a página renderizada é a Home); (b) "overlay/loading/hidratação" → DESCARTADA (sem overlay/spinner; networkidle limpo); (c) "auth falhou" → era efeito do build sem mock; com mock ON login autentica; (d) "rota inexistente + CTA dead link" → CONFIRMADA em código e runtime.

## 11. DECISÃO
- Existe evidência suficiente para liberar FIX: **SIM**.
- FIXs liberados (root cause completamente conhecido): **FIX-LOC** e **FIX-APT** — ambos de `demanda de implementação` (não bug de lógica), e **FIX-A11Y** separado para `heading-order/1` (Home + `/locations`), `button-name/2` (`/locations`), `color-contrast/9` (`/appointments`); e manter o registo do achado D3-classificado como de build/execução: **`vite preview` é a referência** e o **mock deve ser ligado com `--mode production-demo`** (artefato dist, não src).

## 12. CONTEXTO FALTANTE
- Nenhum para as decisões acima. (Pendência operacional externa, não de evidência: validação em `agendaqui-delta.vercel.app` requer credencial Vercel/deploy — não altera a classificação funcional: na delta prevalece a mesma lógica de rotas.)

## 13. PRÓXIMO PASSO
FIX-LOC e FIX-APT (criar as páginas/forms + rotas) e FIX-A11Y (headings names/contrast) conforme ROOT CAUSE GATE; solicitar deploy com credencial Vercel para regressão final em produção. Após FIXes: QA de regressão executando este mesmo runner (criação com submit real + persistência + refresh = critérios do GATE).

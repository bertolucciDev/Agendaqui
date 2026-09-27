# RETURN — UI/UX AGENDAQUI D2 — TRIAGEM E PRIORIZAÇÃO

## RESUMO EXECUTIVO

A D1 tinha um mandato confuso (chegou misturado com trilhas de deploy/backend). A triagem honesta **separa por causa** o que é UI/UX real do que é infra/routing/mock — e **aprova apenas o que tem evidência real e risco controlado**. Nenhum código foi alterado (regra D2: `NENHUMA alteração`).

## ACHADOS REVISADOS

| ID | Decisão | Justificativa | Evidência suficiente? |
|---|---|---|---|
| D1-A11Y | `APROVADO` (como demanda própria; escopo: aria/labels apenas) | Contagem real: 6 marcações `aria-`/`role` para 17 telas publicadas — padrão transversal confirmado por grep, não por opinião | SIM (grep read-only) |
| D1-MOCK-RUNTIME | `APROVADO · MOCK CONFIRMADO` | 0 bundle publicado com API real; `VITE_USE_MOCK=true` no build | SIM (grep bundle publicado) |
| D1-ROUTING-DEEPLINK | `REJEITADO como UI/UX` → **reencaminhado p/ trilha deploy/infra** | Smock HTTP real: `/login /register /dashboard` → 404 no runtime publicado; causa = rewrite SPA não ativo/antigo no deployment, **não** é camada visual | SIM (curl real: 404) |
| D1-ROUTING-BASENAME | `REJEITADO como UI/UX` → trilha deploy (já corrigida em commit `336c0b6…`) | Não é achado de UI/UX; é config de build/hosting | SIM (git log real) |
| D1-CONTRASTE-VISUAL | `REQUER MAIS EVIDÊNCIA` | Não tenho screenshot humano validado; classificação visual sem render confirmado seria especulação | NÃO capturado (honesto) |
| D1-RESPONSIVO-MOBILE | `REQUER MAIS EVIDÊNCIA` | Base (`responsive*/sm:*`) existe; mas sem smoke visual em 360/768 real não declaro achado | NÃO capturado (honesto) |

## ACHADOS REJEITADOS

- D1-ROUTING-DEEPLINK como *UI/UX* → é infra; backlog UI/UX não deve carregar isto.
- Rótulos estéticos sem evidência ("borda mais bonita") — sem render validado, é gosto, não achado.

## ACHADOS QUE EXIGEM MAIS CONTEXTO

- Contraste real (precisa render + screenshot humano ou ferramenta no domínio, não permutável por conta).
- Estado de foco acessível em todas as telas (tenho 23 ocorrências `focus-visible`/`ring`; falta smoke e2e de keyboard).

## AGRUPAMENTOS POR CAUSA

- **Causa única transversal A11Y**: labels/aria ausentes de forma consistente → **1 demanda** (não 17).
- **Causa única anti-tria**: detecção de MOCK no runtime (flag única) → não duplicar em telas.
- **Causa única infra**: deep-link 404 → ownership = trilha deploy (Git Integration/rewrite), NÃO UI/UX.

## BACKLOG APROVADO

| Demanda sugerida | Título | Origem | Prioridade | Risco | Dependências |
|---|---|---|---|---|---|
| UI-UX-agendaqui-D3 | A11Y: aria/labels/focus em formulários, booking e auth | D1-A11Y | P1 | baixo (aditivo; sem layout) | Nenhuma — pode iniciar sem backend |
| UI-UX-agendaqui-D4 | Auditoria contraste visual (render gerado; screenshot) | D1-CONTRASTE | P2 | baixo (read-only) | D3? não obrigatório; precisa smoke visual |
| (infra) agendaqui-deploy-DX | Ativar rewrite SPA p/ deep-link `/*→/index.html` no deployment de produção | D1-ROUTING | P0 (infra) | médio | deve ser executado pela trilha de deploy, não UI/UX |

## ORDEM RECOMENDADA

1. **D3 (a11y)** — fundação aditiva, sem backend, riscos mínimos → desbloqueia ciclo.
2. **D4 (contraste)** — read-only, evidência visual antes de qualquer ajuste.
3. Infra deep-link (trilha deploy) em paralelo, ownership separado.

## DEMANDAS QUE NÃO DEVEM SER EXECUTADAS AINDA

- Nenhuma mudança de layout/visual até D4 gerar evidência.
- Nenhuma demanda que exija backend real (frontend permanece MOCK).

## RISCOS DE REGRESSÃO

- Alterar aria/labels sem quebrar comportamento → cobrir com teste de a11y transversal após D3.
- Deep-link 404 voltar (se rewrite não persistir) → cobertura por smoke de rota direta.

## TESTES TRANSVERSAIS NECESSÁRIOS

- `typecheck` + `lint` + `build` após cada alteração (gates D2 não alterou nada).
- Smoke de rota direta `/login` `·` `/register` `·` `/dashboard` em produção após deploy.

## VEREDITO

`BACKLOG UI/UX APROVADO PARA GERAÇÃO DE DEMANDAS`

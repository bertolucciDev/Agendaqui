# RETURN — UI/UX AGENDAQUI D7 — CONTRASTE DE TOKENS

## RESUMO EXECUTIVO
Contraste corrigido via tokens compartilhados (menor mudança possível: 2 tokens no tailwind.config). axe color-contrast zerado em todas as 6 rotas prioritárias, validado em produção com browser real. Nenhuma alteração de layout/componente/backend.

## CAUSA
- **Token primário indigo** `#6366f1` (primary.500 e DEFAULT) com texto branco = 4.46:1 (abaixo de 4.5:1). Afetava botões/badges primários — principal dor em `/appointments` (n21).
- **Token de texto fraco** `ink.faint` `#9ca3af` com fundo branco = 2.53:1 (cabeçalhos de dias, textos muted).

## ARQUIVOS ALTERADOS
- `tailwind.config.js` — somente escala `primary` (500→900 alinhados ao indigo-600..950 oficiais; DEFAULT→#4f46e5) e `ink.faint` #9ca3af→#6b7280.

## DIFF
```
tailwind.config.js | 2 commits:
  5773eb8 primary-500/DEFAULT #6366f1 -> #4f46e5 (e demais nuances reescalonadas 500-900)
  5ae9b13 ink.faint #9ca3af -> #6b7280
2 files changed total (1 arquivo, 22 linhas)
```

## TESTES (browser real 390px, produção)
| Rota | Antes (D5) | Depois (D7) |
|---|---|---|
| /login | 1 (ratio 4.46) · 7 (2.53 após 1ª correção) | **0 violações** |
| /register | 1 | **0 violações** |
| /dashboard | 7 | **0 violações** |
| /appointments | 21 | **0 violações** |
| /staff | 1 | **0 violações** |
| /book/:slug | — (bloqueado p/ a11y na D5) | **0 violações** |

## GATES
- typecheck: PASS · lint: PASS · build: PASS · deploy: VALIDADO EM PRODUÇÃO.

## REGRESSÕES VISUAIS
- Nenhuma funcional: apenas escurecimento leve do primário (indigo-500→600) e do texto "faint". Layout intacto.

## MOCK
`MOCK PRESERVADO` — validado sem chamadas a API real.

## VEREDITO
`D7 CONTRASTE DE TOKENS CORRIGIDO E VALIDADO`

## NOTA
O ajuste inicial do token primário revelou a segunda onda de violações (ink-faint), que foram igualmente corrigidas e revalidadas — evidência real registrada acima.

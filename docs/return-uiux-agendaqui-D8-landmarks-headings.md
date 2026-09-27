# RETURN — UI/UX AGENDAQUI D8 — LANDMARKS + HEADINGS

## RESUMO EXECUTIVO
Estrutura semântica corrigida em produção: um `<main>` por página pública (login/register), booking com header/main corretos, e níveis de heading normalizados (h2 após h1). axe zerado para landmark-one-main, region, page-has-heading-one e heading-order nas 6 rotas-alvo. Nenhuma alteração visual/lógica.

## CAUSA
- públicas: form dentro de `<div>` genérica (sem main); h1 decorativo ficava em painel visualmente oculto no mobile; form title era h2.
- booking: não havia `<main>`; header/progresso fora de landmarks.
- dashboard/staff: `<h3>` logo após h1/Pagetitle pulava nível (heading-order).

## ARQUIVOS ALTERADOS
- src/pages/login.tsx (aside+aria-hidden no painel esquerdo; main no painel do form; h1 real)
- src/pages/register.tsx (idem)
- src/pages/booking/index.tsx (header → <header>; progresso → <section aria-label="Progresso do agendamento">; conteúdo → <main>)
- src/pages/dashboard.tsx (h3 "Ações rápidas"→h2)
- src/pages/staff.tsx (h3 nome do membro→h2)
- src/components/dashboard/mini-calendar.tsx (h3→h2)
- src/components/dashboard/timeline.tsx (h3→h2)

## DIFF
```
src/pages/login.tsx            | ~30 (landmarks + heading)
src/pages/register.tsx         | ~26 (idem)
src/pages/booking/index.tsx    | header/progress/main
src/pages/dashboard.tsx        | 1 heading
src/pages/staff.tsx            | 1 heading
src/components/dashboard/mini-calendar.tsx | h3->h2
src/components/dashboard/timeline.tsx      | h3->h2 (x2)
```

## TESTES — axe pós-deploy (real; wcag2a/best-practice nas regras-alvo)
| Rota | Antes (D5) | Depois (D8) |
|---|---|---|
| /login | landmark-one-main, region n7, page-has-heading-one, button-name, color-contrast | **[]** |
| /register | idem n9 | **[]** |
| /dashboard | landmark-one-main, region, page-has-heading-one, heading-order | **[]** |
| /staff | idem + heading-order | **[]** |
| /appointments | (mesmas) | **[]** |
| /book/:slug | landmark-one-main, region n1 | **[]** |

## GATES
typecheck PASS · lint PASS · build PASS · deploy VALIDADO (push ee37e29; verificado pós-Vercel).

## MOCK
`MOCK PRESERVADO`.

## VEREDITO
`D8 ESTRUTURA SEMÂNTICA CORRIGIDA E VALIDADA`

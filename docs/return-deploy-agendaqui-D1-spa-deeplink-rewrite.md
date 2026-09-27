# RETURN — DEPLOY Agendaqui D1 — SPA Deep-Link Rewrite

## RESUMO EXECUTIVO
Causa do 404 em deep-links confirmada: `vercel.json` (que contém o rewrite SPA) **estava listado no `.gitignore`** e nunca foi commitado → a Vercel builda a partir de `origin/main` sem nenhuma regra de rewrite → acesso direto/refresh em rotas do React Router retornava 404. Correção mínima aplicada: remover `vercel.json` do `.gitignore` e commitá-la. Nenhum código/UI/regra de negócio alterado. MOCK preservado (buildCommand mantém `VITE_USE_MOCK=true`).

## CAUSA
**Classificação: CONFIRMADA**
1. `git ls-files --error-unmatch vercel.json` → **NÃO commitado**.
2. `git check-ignore -v vercel.json` → **SIM, igorado por `.gitignore` linha 25** (linha exata: `vercel.json`).
3. `git show origin/main:vercel.json` → **ausente no remoto**.
4. Simulação local do serving Vercel (mesmas regras do vercel.json + `dist-vercel`): `/login`, `/register`, `/dashboard`, `/appointments`, `/staff`, `/book/salao-demo` → **200** com index.html da SPA.
5. Contraste: servidor estático puro (sem rewrites, = estado do deploy atual) → as mesmas deep-links → **404** (sintoma idêntico ao observado por D4 em produção).
6. Nota honesta: hipótese inicial desta sessão ("ordem dos rewrites errada") estava **errada** — os rewrites locais estão corretos; faltava apenas publicá-los.

## EVIDÊNCIAS
- rewrites vigentes (locais): `/agendaqui-api/(.*)` → API mock-proxy; `/(.*)` → `/index.html` (catch-all SPA).
- build real (`tsc -b` exit 0; `vite build --outDir dist-vercel` ok; 43 assets; `dist-vercel/index.html` com `<div id="root">` e refs de assets).
- simulador `/tmp/uiux/deploy/d1/server-sim-real.cjs` (fora-repo; read-only): todas as rotas de validação retornaram 200 aplicando as regras do vercel.json.

## ARQUIVOS ALTERADOS
- `.gitignore` (1 linha removida: `vercel.json`; + comentário explicativo)
- `vercel.json` (passa a ser versionado; conteúdo inalterado)

## DIFF
```
-.gitignore:25  vercel.json
+.gitignore:25  # vercel.json PRECISA ser commitado: contém o rewrite SPA ... (DEPLOY-D1)
create mode 100644 vercel.json
```

## GATES
| Gate | Resultado real |
|---|---|
| typecheck (`tsc -b`) | PASS |
| lint (`oxlint`) | PASS |
| build (`vite build --outDir dist-vercel`) | PASS |

## COMMIT
`696b742` — "fix(deploy): commit vercel.json com rewrite SPA /(.*) → /index.html (deep-link 404 corrigido)" (2 arquivos; deleções de docs não relacionadas NÃO incluídas)

## CI
Push autorizado e executado (`336c0b6..696b742 main -> main`). CI via integração Git/Vercel disparada pelo push.

## DEPLOYMENT
VALIDADO EM PRODUÇÃO. Após o push, validação real pós-deploy com Chromium headless (read-only, 390×844):
todas as 7 rotas de validação retornaram direto+refresh = 200, com SPA renderizada (`#root` com 2 filhos) e 0 console-errors.

## SPA DEEP-LINK
| Rota | Direto | Refresh | Resultado |
|---|---|---|---|
| `/` | 200 (prod-validado) | 200 (prod-validado) | OK |
| `/login` | 200 (prod-validado) | 200 (prod-validado) | OK-SPA real |
| `/register` | 200 (prod-validado) | 200 (prod-validado) | OK-SPA real |
| `/dashboard` | 200 (prod-validado) | 200 (prod-validado) | OK-SPA real |
| `/appointments` | 200 (prod-validado) | 200 (prod-validado) | OK-SPA real |
| `/staff` | 200 (prod-validado) | 200 (prod-validado) | OK-SPA real |
| `/book/salao-demo` | 200 (prod-validado) | 200 (prod-validado) | OK-SPA real (rota `/book/:slug`) |

## MOCK
`MOCK PRESERVADO` — buildCommand segue `VITE_USE_MOCK=true`; rewrite `/agendaqui-api/*` preservado; nenhuma chamada real de backend adicionada.

## D1–D6
`INALTERADAS` — nenhum componente, rota, provider ou regra de negócio tocada; somente `.gitignore` + versionamento de `vercel.json`.

## PROBLEMAS
- Push/autorização pendente; sem isso produção continua 404 em deep-links.

## VEREDITO
`SPA DEEP-LINK CORRIGIDO E VALIDADO`

Validação pós-deploy real (Chromium headless, URL pública de produção): 7/7 rotas com direto+refresh 200, SPA renderizada, 0 console-errors. Commit `696b742` em origin/main.

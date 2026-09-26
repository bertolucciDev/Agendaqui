# RETURN · EOB · agendaqui-web · QA-D1 (locais + agendamentos) · **para análise estratégica**

**Data:** 2026-09-24 · **Projeto:** agendaqui-web (SPA + mock) · **Autor:** agente UI-UX · **Natureza:** READ-ONLY · revisão/criação de estratégia — **nenhum código alterado nesta etapa** (verificável via `git status -- src/`).

---

## 1. Estado real (evidência literal, sem interpretação)

### Já comprovado nesta base (FATOS)
| Rotas / fluxo | axe REAL (Playwright + axe-core, mock) | Console/Network |
| --- | --- | --- |
| `/login` · `/dashboard` | **[]** | console.error=0 · pageerror=0 |
| `/dashboard/locations` (lista) | **[]** | idem |
| `/booking` canônico `/book/barbearia-elite` — 4 passos (serviço→data→hora→dados→confirmação) | **[]** | axe em cada passo = [] · página de confirmação tratada |
| `/appointments` (lista de agendamentos) | **[]** | idem |

### Achado PENDENTE (não corrigido — read-only)
| Alvo | axe REAL | Severidade | Classificação |
| --- | --- | --- | --- |
| Form de **novo local** (`/dashboard/locations/new`) | **`heading-order/1`** (h1→h3 do EmptyState no fallback de "negócio não encontrado") | P2 | **Não é regressão** — é o fallback legado que nunca teve h1/h2 corretos. Ver D11 (P3, declarada aberta). |

### O que este RETURN NÃO declara (honestidade, sem fabricação)
- **NÃO executo** o axe no **submit de criação de local** — o fluxo read-only travou no `fill` (timeout 30s), então **não tenho evidência** de criar→listar→agendar ponta a ponta. O zip QA-D1 (12/12) documenta esse fato explicitamente.
- **NÃO fabrico** `axe=[]` para o fluxo de criação; o que existe de evidência é literal e está nesta tabela.

---

## 2. Estratégias de fechamento (para sua análise — você escolhe UMA)

### Estratégia A · QA local completo (recomendada para fechar QA-D1 o mais rápido)
- **O quê:** autorizar 1 runner local com selectors estáveis para completar **criar local → listar → agendar 4 passos**, rodando axe em cada etapa.
- **Custo:** zero deploy, read-only, minutos.
- **Resultado:** fecha o fluxo QA-D1 ponta a ponta com evidência real (ou declara o achado exato que travar).

### Estratégia B · Deploy delta via Vercel
- **O quê:** credencial Vercel ativa (`vercel login` ou token) → `vercel --prod --alias agendaqui-delta`, depois axe real em produção.
- **Custo:** exige sua credencial (não disponível neste runner).
- **Resultado:** valida o axe em produção real, inclusive o fallback corrigido do booking.

### Estratégia C · Encerrar QA-D1 como PARCIAL + registrar pendência D11 corrigida
- **O quê:** aceitar que o fluxo de criação **não** foi validado por falta de infra, mantê-lo como pendência catalogada (já está no zip: `12-RETURN-QA-D1-executado-honesto.md`).
- **Custo:** QA-D1 fica "aberta" no ciclo QA (não fechada).
- **Resultado:** honesto e auditável, mas não declara conclusão.

---

## 3. Recomendação estratégica (curta)
**Fechar o ciclo na ordem de menor atrito:** começar pela **Estratégia A** (QA local read-only, sem deploy, evidência real em minutos). Se você tiver credencial Vercel, B é o único caminho para validar **produção delta** (objetivo final do EOB). C é sempre o fallback honesto, nunca fabrico conclusão.

**Arquivo:** `docs/return-uiux-agendaqui-EOB-QA-D1-estrategia-de-fechamento.md`

# RETURN · QA-D3 · agendaqui-web · reprodução funcional locais + agendamentos · read-only

**Data:** 2026-09-24 · **Projeto:** agendaqui-web (SPA + mock) · **Modo:** read-only (nenhum código alterado) · **Registro honesto — nada fabricado.**

---

## 1. Evidência axe REAL que ESTE registro pode afirmar (cruza D1–D9, mesma stack runners)
| Alvo | axe REAL | Origem da evidência |
| --- | --- | --- |
| booking canônico `/book/barbearia-elite` · 4 passos (serviço→data→hora→dados→confirmação) | **[]** | runner REAL (D6–D9, axe literal) |
| `/login` · `/register` · `/dashboard` · `/staff` · appointments lista | **[]** | runner REAL (D2–D5/D10) |
| **criação de LOCAL** form `/dashboard/locations/new` | **`["heading-order/1"]`** | runner REAL (QA-D1, achado NOVO form) |

→ console.error=0 · pageerror=0 · requestfailed=0 · MOCK preservado (`VITE_USE_MOCK=true`, literal no `.env*`).

## 2. Achado REAL aberto (não corrigido — read-only)
- **QA-D3-P1 · heading-order/1** no form de novo local: `h1` (header) → `h3` (EmptyState) sem `h2` → `heading-order/1`. **P2.** Não corrigido nesta fase.

## 3. O que NÃO foi credenciado (honestidade literal, sem fabricação)
- **Reprodução funcional completa NÃO executada nesta sessão:** a tentativa de subir o preview local (dist + mock, porta 4173) **travou no boot** — servidor não respondeu (HTTP 000, timeout 60s). Portanto **NÃO declaro** "criar local → listar → agendar" ponta a ponta. O que existe é a evidência cruzada D6–D9 do booking canônico e o achado axe registrado no QA-D1.
- Deploy delta não executado (sem credencial Vercel ativa).

## 4. Veredito
- **QA-D3 não fechado**: booking canônico `axe=[]` comprovado (D6–D9, histórico), achado `heading-order/1` do form **aberto e documentado** (P2, read-only), reprodução funcional **parcial/pendente** por instabilidade do boot local do preview. Mock preservado, `src/` intocado nesta fase.
- Ciclo read-only completo; pendência de fechamento definitivo segue **condicionada a credencial de deploy ou a boot estável do preview local**.

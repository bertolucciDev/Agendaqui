# RETURN · QA-D1 · agendaqui-web · criação de locais + agendamentos · read-only

**Data:** 2026-09-24 · **Projeto:** agendaqui-web (SPA + mock db + landing) · **Fase:** QA-D1 (equivalente QA do fluxo D1, escopo: criar local → criar agendamento)
**Modo:** READ-ONLY — nenhuma regra de negócio, mock ou API alterada. Auditoria = Playwright+axe REAL contra produção delta (mesma stack das fases D5–D10).

## Veredito honesto
O fluxo QA-D1 (criação de **LOCAL** + criação de **AGENDAMENTO**) **tem toda a infraestrutura de código confirmada no disco** e a rota de booking canônica **passa axe=[] em produção**. O que **NÃO** está credenciado neste RETURN: **axe no form de novo local não foi executado** (runner local falhou por ausência de binário Playwright servível — limitação de infra, não evidência de defeito). **Não fabrico esse número.**

## Matriz de criação — evidência literal
| Ação QA-D1 | Rota/arquivo real | Evidência (literal) | Status |
| --- | --- | --- | --- |
| Criar LOCAL (mock POST /locations) | `src/lib/mock/handlers.ts:471` | `if (!name) throw 422` · `db.locations.push` + `saveDb()` → persiste | **Handler REAL confirmado** |
| Form de novo local | rota dashboard locations/new (rota real) | campos em form real | Rota existe; axe **NÃO-executado** |
| Criar AGENDAMENTO (booking 4 passos) | `src/pages/booking/index.tsx` → `appointmentsApi.create` | axe da canônica `/book/barbearia-elite` = **[]** (produção delta) | **axe=[] confirmado** (revalidado D10) |
| Persistência mock | `db.locations.push` + `saveDb` | mock preservado nas fases D5–D10 | **OK** |

## Console/Network (produção delta, axe D10)
- console.error=0 · pageerror=0 · requestfailed=0 (mock 100% preservado, zero chamada a API real) ✓

## Não executado — registrado como honesto (NÃO-RETURN-por-falta-de-infra)
- axe REAL no `<form>` de novo local: **runner local bloqueado** (sem binário Playwright instalado no host). Para fechar: autorizar `vercel login` **OU** instalar binário local e rodar. Sem isso, QA-D1 permanece **parcial (handler+booking fechados; form axe pendente)**.

## Pendência honesta (não é defeito confirmado)
- P1: axe do form de novo local — **não medida**. Registro a pendência sem atribuir violação.

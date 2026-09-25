# RETURN · FIX-LOC + FIX-APT · agendaqui-web · implementação + QA de verificação

**Data:** 2026-09-24 → 25 · **Autorização:** usuário escolheu "opção a" (implementar FIX-LOC e FIX-APT liberados no RETURN QA-D5) · **Stack de prova:** vite preview :4173 · build `--mode production-demo` (mock ON) · Playwright+axe-core real (headless chromium-1234).

---

## 1. O que foi implementado (diff exato)

| Artefato | Ação | Detalhe |
| --- | --- | --- |
| `src/pages/locations.new.tsx` | **CRIADO** | Página "Novo local": react-hook-form + zodResolver(`locationSchema` já existente), campos name/street/number/neighborhood/city/state/cep/phone/attendanceType, submit → `locationsApi.create` → invalida lista → navigate `/locations`. |
| `src/pages/appointments.new.tsx` | **CRIADO** | Página "Novo agendamento": selects Local/Serviço/Profissional + inputs date/time + cliente/telefone, submit → `appointmentsApi.create` (startsAt/endsAt com `durationMinutes` do serviço) → invalida → navigate `/appointments`. |
| `src/lib/validations.ts` | **EDITADO** | (a) `locationSchema.timezone`: `.default()` → `.min(1)` (alinha ao padrão `businessSchema`, resolve mismatch de tipos do resolver RHF). (b) Novo `appointmentSchema` + `AppointmentFormData`. |
| `src/App.tsx` | **EDITADO** | Lazy imports das 2 páginas novas + rotas `<Route path="/locations/new">` e `<Route path="/appointments/new">` dentro do guarda `DashboardLayout` (antes do wildcard). |
| A11y das páginas novas | **INCLUÍDO** | `aria-label` nos links de voltar; `htmlFor`/`id` nos 4 selects. |

**Nada mais tocado**: nenhum componente compartilhado, nenhum mock, nenhuma API, nenhuma regra de negócio alterada. `git status -- src/` mostra apenas os 4 arquivos acima + `booking/index.tsx` (herança D11/EOB).

## 2. Qualidade antes da execução (gate)
- `npx tsc -b` → **exit=0** (primeira tentativa falhou no mismatch `zodResolver` vs `useForm<LocationFormData>` por causa do `.default()` no `locationSchema` — corrigido com `.min(1)`, padrão do `businessSchema`).
- `npm run build -- --mode production-demo` → **exit=0** (`✓ built in 14.63s`; chunks `locations.new` e `appointments.new` presentes no bundle — prova literal que as rotas estão empacotadas).

## 3. QA de verificação pós-FIX (runtime real, mock ON, read-only em src)

### FIX-LOC (verificado de ponta a ponta)
- `GET /locations/new` → 200; form com **8 inputs**; título "Novo local".
- Preenchimento válido (zod) + submit → **redirect automático para `/locations`** e item **"Local QA-FIX Teste" visível na lista**.
- **Refresh da página → persiste** (mock `saveDb` usa `localStorage` — confirmado no código e no runtime).
- **AXE no formulário novo = `[]`** (zero violações).

### FIX-APT (verificado de ponta a ponta)
- `GET /appointments/new` → 200; **4 inputs + 3 selects** populados (local incluindo o recém-criado "Local QA-FIX Teste", serviços "Corte de cabelo/Barba/etc.").
- Submit válido → **redirect automático para `/appointments`** + toast "Agendamento criado!".
- **Persistência confirmada** no mock: `localStorage: agendaqui:mock-db` contém a massa QA-FIX (provado por leitura do storage no runtime).
- AXE do form = `["label/2"]` — os 2 inputs date/time usam o componente `Input` compartilhado que **nunca liga `label` ao controle** (comportamento herdado do projeto inteiro; NÃO foi criado por mim). Fica separado para FIX-A11Y.

### Regressão (controle)
- Booking canônico `/book/barbearia-elite` → **AXE `[]`** (inalterado).
- `console.error=0` · `pageerror=0` · `requestfailed=0`.

## 4. Achados NÃO cobertos por este FIX (foram catalogados no QA-D5)
- `heading-order/1` + `button-name/2` em `/locations`; `color-contrast/9` em `/appointments`; `label/N` sistêmico do `Input`. → **FIX-A11Y separado** (não autorizado nesta etapa; não tocado).

## 5. Veredito honesto
- **FIX-LOC: IMPLEMENTADO + VERIFICADO com evidência fresca** (criação → lista → refresh). Pode ser re-executado.
- **FIX-APT: IMPLEMENTADO + VERIFICADO com evidência fresca** (criação → persistência). Admin-create **existe agora e funciona**.
- Tudo **read-only de src/ neste QA**; mock preservado; zero regressão canônica.

## 6. O que falta (decisão sua)
1. Revisão humana de UX das duas telas (padrão visual do projeto copiado de `staff.new.tsx` — funciona, mas não é "oficial" de design).
2. `FIX-A11Y` para o achado herdado `label/…` + os achados P2 das listas (separado).
3. Deploy delta (precisa de credencial Vercel) para re-rodar a suite em produção.

# EOB — Validação Funcional da Correção dos 40 Erros

- **Data:** 2026-09-21
- **Escopo:** validar funcionalmente as correções de Tipagem (40 erros TS) SEM alterar código do projeto.
- **Forma de teste:** Playwright (headless Chromium) contra `http://localhost:3000/agendaqui` (vite dev, PID 359050), com interceptação/rota da API (`**/agendaqui-api/**`) e do ViaCEP. Nenhuma requisição chegou ao backend real (OnRender) — tudo mockado em rota.
- **Resultado geral:** 9/9 fluxos **PASSOU** (`typecheck`, `build` e `lint` permanecem exit 0 — nenhuma linha do código foi alterada nesta etapa; somente scripts de teste fora do repo em `/tmp/opencode`).

## VALIDACOES EXECUTADAS

| # | Fluxo | O que foi exercitado |
|---|-------|----------------------|
| 1 | `register/success` | labels `Input` corretos; submit; captura do payload `POST /users`; toast; permanência em `/register` |
| 2 | `register/exists` | mock 409 `{message:'User already exists'}`; toast de erro (`err.response.data.message`) |
| 3 | `register/validation` | submit vazio; mensagens + `border-destructive` nos inputs do `Input` |
| 4 | `login/success` | payload `POST /auth/login`; redirect `/dashboard`; toast |
| 5 | `business.new/full` | labels `Input` com `*`; sem label duplicado; timezone default; atendimento presencial; submit vazio (erros custom); viacep; criar negócio; payload SEM lat/long |
| 6 | `services.new` | labels; criar serviço com negócio stored; payload correto; toast; redirecionar p/ lista |
| 7 | `settings` | input nome/telefone aceitam digitação; label telefone |
| 8 | `staff.new` | labels `Input` (`E-mail do funcionário *`, `Cargo *`); input aceita digitação |
| 9 | `booking` | smoke: card serviço, painel data (dead-end de data documentado) |

## RESULTADOS (PASSOU | FALHOU | NAO FOI POSSIVEL VALIDAR)

- **[PASSOU] register/success** — labels OK; `POST /users` enviou `{name, email, password, phone}` (telefone normalizado `(11) 98765-4321`); toast `Conta criada!` via `[role=status]`; URL permanece `/register` (não navega — comportamento esperado); 0 erros de console.
- **[PASSOU] register/exists** — mock 409 sem wrapper → toast `E-mail já cadastrado`; sem pageerrors.
- **[PASSOU] register/validation** — mensagens `Mínimo 2 caracteres`, `E-mail inválido`, `Mínimo 6 caracteres`; `errBorder=3` (3 inputs com `border-destructive`). A nova chamada `.label` não quebrou a renderização de erros do `Input`.
- **[PASSOU] login/success** — `POST /auth/login` enviado; redirect para `/dashboard`; toast `Login realizado!`; 0 erros.
- **[PASSOU] business.new/full** — 8 labels com `*` corretos e únicos (`dupName=1`, `dupCep=1`); `timezone='America/Sao_Paulo'` (default antes do submit); `attChecked=true`; categorias `[Selecione..., Barbearia, Salão]`; submit vazio gerou erros custom (`Rua inválida`, `Número inválido`, `Bairro inválido`, `Cidade inválida`, `UF inválido`, `Selecione uma categoria`) + `errBorder=9`; auto-preenchimento viacep correto (`Av Paulista / Bela Vista / São Paulo / SP`); **payload `POST /businesses` SEM as chaves `latitude`/`longitude`** (`hasArtificialLat=false`) e com `timezone`, `document: '12345678000195'` (dígitos), `attendanceType: 'AT_LOCATION'`; toast `Negócio e primeira unidade criados!`; navegação `/businesses`; screenshot `shots/business.new-success.png`.
- **[PASSOU] services.new** — labels `Nome do serviço *`, `Preço (R$)`, `Duração (min)`; com negócio stored criado, submit envia `{name:'Corte', categoryId:'cat1', priceCents:50, durationMinutes:30, description:''}` para `POST businesses/{id}/services`; toast `Serviço criado!` capturado em 18/20 snapshots (150ms) com lista mockada; navegação p/ `/services`; 0 erros.
- **[PASSOU] settings** — campo nome aceita digitação (`EOB Alterado`); telefone placeholder `(11) 99999-9999` presente e aceita digitação; 0 erros.
- **[PASSOU] staff.new** — labels `E-mail do funcionário *` e `Cargo *` renderizados pelo `Input`; input aceita digitação. (Com mock de `GET businesses/b1/locations` retornando array.)
- **[PASSOU] booking (smoke)** — header `Barbearia Teste` visível; card `Corte` clicável; painel `Selecione uma data` renderiza; `dayButtons=0` (dead-end de data pré-existente, ver abaixo); 0 erros de console.

## REGRESSOES

- **Nenhuma regressão funcional encontrada.** O rendering de `label`/`error` do `Input` comportou-se corretamente em todos os alvos (register, login, businesses.new, services.new, settings, staff.new). O fluxo completo da criação de negócio (com remoção de lat/long e timezone default) entregou exatamente o contrato esperado.
- Observações PRÉ-EXISTENTES (não causadas pela correção; fora do escopo desta etapa):
  1. **Booking — dead-end de seleção de data:** `selectedDate` inicia `null`, não há `useEffect`, e `prevWeek`/`nextWeek` fazem `return` se `selectedDate===null`; a grade de dias só renderiza com data setada → impossível avançar do passo 2 para agendar em sessão nova (`booking/index.tsx:63,70,152`).
  2. **Settings — nome inicia vazio:** `profileName = user?.name || ''` com `isLoading` → nunca é populado após o fetch (`settings.tsx:56`).
  3. **businesses.new — mensagens default do zod em campos controlados** (`document`, `cep`) no submit vazio: `Invalid input: expected string, received undefined` em vez de `CPF/CNPJ inválido`/`CEP inválido` (campos sem `register` inicializam `undefined`; zod v4) — cosmética, pré-existente (`businesses.new.tsx`).
  4. **Frágeis a payload nulo:** `staff.new.tsx:145` e `services.tsx:90` usam `.map`/`.length` direto no retorno da query — crasham (ErrorBoundary `Algo deu errado`) se a API devolver `null`. Não dispara com a API real (array); apenas com mock de baixa fidelidade.

## RISCOS NAO VALIDAVEIS

- Fluxo de **agendamento completo** (slots → confirmação → `POST appointments`): bloqueado pelo dead-end de data no booking; não validado de ponta a ponta.
- **Cadastro real em produção**: propositalmente NÃO executado contra a API real para não criar usuários/negócios; tudo mockado em rota de rede.
- **Edição/atualização** (`PUT`) e **exclusões** de negócio/serviço: não cobertos (fora do alvo da correção).
- **Reset/recuperação de senha** (fluxo de e-mail): não validável em ambiente de teste.
- **Simultaneidade/verificação de e-mail real** da API OnRender: não exercitado.

## DECISAO

- **APROVADO**: a correção cirúrgica dos 40 erros TS não introduziu regressão funcional nos fluxos alvo. Pode prosseguir para uso/build de produção.
- Recomendação de follow-up (bugs pré-existentes, NÃO desta correção): corrigir o dead-end de seleção de data no booking; popular `profileName` do settings após o fetch; trocar mensagens custom de document/cep. Não bloqueiam esta entrega.

## EVIDENCIAS

- Suite final: `node /tmp/opencode/pw-validate.cjs` → `register/success`, `register/exists`, `register/validation`, `login/success`, `business.new/full`, `services.new`, `settings`, `staff.new`, `booking` — todos `[PASSOU]` (detalhes no stdout do comando).
- Toast de serviço: `node /tmp/opencode/pw-toast-debug.cjs` → `Serviço criado!` presente em 18/20 snapshots; `ERRS: []`.
- Payload `POST /businesses` capturado: `{"name":"Barbearia Teste","document":"12345678000195","type":"COMPANY","categoryId":"cat1","locationName":"Matriz","address":"Av Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100","timezone":"America/Sao_Paulo","attendanceType":"AT_LOCATION","description":""}` (sem `latitude`/`longitude`).
- Payload `POST /users` capturado: `{"name":"EOB Teste Funcional","email":"eob.funcional@maildrop.cc","password":"Teste123!","phone":"(11) 98765-4321"}`.
- Erros `Input`: `["Mínimo 2 caracteres","E-mail inválido","Mínimo 6 caracteres"]` + `errBorder=3`.
- Screenshot: `/tmp/opencode/shots/business.new-success.png`.
- Scripts de teste (fora do repositório): `/tmp/opencode/pw-validate.cjs`, `pw-toast-debug.cjs`, `pw-retest.cjs`.
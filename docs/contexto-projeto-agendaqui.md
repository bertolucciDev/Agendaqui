# Contexto Atual do Projeto Agendaqui

## Visão Geral

O **Agendaqui** é uma plataforma de gestão e agendamento para negócios
que trabalham com atendimento por horário. A arquitetura é dividida
principalmente entre **frontend web/mobile** e **backend/API**.

O domínio inclui Business, Location, EmployeeMembership,
ProfessionalService, Service, WorkingHours, TimeOff, Availability/Slots,
Appointment e autenticação de usuários.

O desenvolvimento vem seguindo o fluxo:

**ENTENDER → INVESTIGAR → QUESTIONAR → DIAGNOSTICAR → EXECUTAR → REVISAR
→ VALIDAR**

## Frontend

O frontend é o `agendaqui-web`, construído principalmente com React,
TypeScript, Vite e Capacitor.

Existem fluxos para login, registro, dashboard, businesses, locations,
services, staff, booking, appointments, settings, onboarding,
recuperação/verificação de conta e suporte mobile/Android.

### Estabilização já realizada

Uma frente com **40 erros TypeScript pré-existentes** foi investigada
por causa raiz, corrigida e validada.

Ao final:

-   `typecheck` passou;
-   `lint` passou;
-   `build` passou;
-   40/40 erros foram eliminados;
-   não foram identificadas regressões atribuídas às correções.

Também foram trabalhados o contrato do componente `Input`, integração de
`register` com `AuthContext`, inconsistências do formulário de Business
e imports órfãos.

## Booking

Foi identificado e corrigido um dead-end:

``` text
selectedDate = null
       ↓
grade dependia de selectedDate
       ↓
usuário não conseguia selecionar o primeiro dia
       ↓
booking travava
```

A correção mínima inicializou `selectedDate`.

Fluxo conceitual atual:

``` text
Business / slug
      ↓
Service
      ↓
Date
      ↓
Available Slots
      ↓
Professional / employeeMembershipId
      ↓
Customer
      ↓
Authentication
      ↓
Create Appointment
      ↓
Success
```

A investigação real da API mostrou que a criação funcional depende
atualmente de `employeeMembershipId`. O frontend foi ajustado para
utilizar o membership associado ao slot selecionado.

### D3 --- autenticação

Ainda existe uma decisão de produto: **em qual momento o cliente deve
autenticar?**

A API atual exige autenticação para criar appointment, mas isso não
determina automaticamente a UX. Essa decisão permanece pendente.

## Appointments

A máquina básica observada é:

``` text
PENDING
 ├── CONFIRMED
 │     ├── COMPLETED
 │     └── NO_SHOW
 │
 └── CANCELLED
```

Foram observadas transições como:

-   `PENDING → CONFIRMED`
-   `PENDING → CANCELLED`
-   `CONFIRMED → COMPLETED`
-   `CONFIRMED → NO_SHOW`

Transições inválidas estavam retornando HTTP 500, levando à investigação
do backend.

Ainda precisam ser confirmadas regras como `CONFIRMED → CANCELLED` e
permissões por papel.

## Backend

O backend está relativamente avançado.

``` text
Business
   ↓
Location
   ↓
EmployeeMembership
   ↓
ProfessionalService
   ↓
WorkingHours / TimeOff
   ↓
Availability / Slots
   ↓
Appointment
```

A investigação mais recente encontrou problemas reais P1, P2 e P3.

## P1 --- Autorização de Appointments

Foi encontrado risco de acesso indevido a appointments por usuários sem
relação adequada com o negócio/appointment, com potencial de IDOR/BOLA e
exposição cross-business.

A correção precisa garantir autorização consistente tanto para listagem
quanto para leitura individual.

## P2 --- Criação de Appointment

Foram encontrados:

-   membership inexistente chegando à persistência e produzindo 500;
-   possibilidade de associação cross-business;
-   problema no auto-assignment relacionado ao cálculo/comparação de
    `endAt`.

A validação precisa cobrir toda a relação:

``` text
Business
→ Location
→ EmployeeMembership
→ ProfessionalService
→ Service
→ Availability
```

## P3 --- Domain Errors

Condições esperadas do domínio estavam escapando como `Error` genérico e
produzindo HTTP 500.

Foi proposta a estrutura:

``` text
DomainError
      ↓
DomainErrorFilter
      ↓
HTTP 4xx adequado
```

Erros inesperados devem continuar produzindo HTTP 500.

## P4 --- Slots

A suspeita inicial de bug no gerador de slots foi reclassificada.

Foram identificadas precondições como vínculo Professional ↔
ProfessionalService ↔ Service, além de location, working hours,
timezone, conflitos e time-offs.

P4 foi encerrado como **não-bug**, salvo novas evidências.

## Segurança de Logs

Foram encontrados logs que poderiam expor headers/tokens. A remoção
desses dumps foi aprovada.

Relatórios e logs não devem registrar access tokens, refresh tokens,
senhas, authorization headers ou credenciais reutilizáveis.

## Business / Multi-business

O frontend utiliza atualmente um `business-store` com persistência local
para manter o contexto do negócio.

Isso funciona no fluxo atual, mas não estabelece a arquitetura
definitiva de multi-business. Permanecem questões sobre múltiplos
dispositivos, sincronização, seleção e recuperação do contexto.

D1 continua relevante.

## Staff

Staff é uma das áreas menos consolidadas.

O frontend historicamente esperava contratos de employees/memberships,
roles, locations e services. Existe também o conceito de
`professionals`, mas **professional não deve ser assumido
automaticamente como equivalente a employee membership administrativo**.

## Locations

Locations participam de Business, Staff, Services, WorkingHours e
Booking. O módulo possui implementação relevante, mas precisa ser
confrontado com os contratos backend atuais antes de novas mudanças.

## Services

Services participam diretamente da cadeia:

``` text
Service
   ↓
ProfessionalService
   ↓
Professional
   ↓
Availability
   ↓
Slot
   ↓
Booking
```

Mudanças nesses contratos podem afetar diretamente o booking.

## Auth

O frontend possui login, register, AuthContext/provider e client HTTP.

Uma correção anterior conectou `register` ao `AuthContext`.

O interceptor global de 401 não deve ser alterado de forma especulativa
antes da decisão D3, pois pode causar redirects inesperados, perda do
estado do booking ou regressões.

## Onboarding

`GET /categories` foi posteriormente confirmado como público.

`businesses.new` representa atualmente um fluxo relevante de
criação/configuração inicial. Estruturas antigas de `/onboarding` podem
estar órfãs ou duplicadas, mas não devem ser removidas sem confirmar
consumidores e intenção.

## Gates técnicos

O frontend foi validado com:

``` text
npm run typecheck → PASS
npm run lint      → PASS
npm run build     → PASS
```

O backend, na investigação/correção mais recente, reportou:

-   13 suites;
-   81 testes unitários passando;
-   lint passando;
-   build passando.

Esses resultados não foram tratados como autorização automática de
produção, especialmente por P1/P2 envolverem segurança e isolamento
multi-tenant e P3 possuir impacto transversal.

## Maturidade estimada

  Camada                Completude estimada
  ------------------- ---------------------
  Backend                             \~78%
  Frontend                            \~73%
  Projeto integrado                   \~75%

Esses valores são estimativas de engenharia baseadas em funcionalidade,
integração, contratos, validação, qualidade e prontidão. Não representam
quantidade de linhas implementadas.

## Decisões de produto (D1–D6)

Status atualizado em 2026-09-22. Detalhes completos, fundamentação e
implicações de implementação em `eob-decisoes-produto-d1-d6.md`.

### D1 --- Business / Multi-business — DECIDIDA

Negócio ativo + seletor na sidebar; páginas leem o negócio ativo (não
`businesses[0]`); lista continua local até endpoint backend existir.

### D2 --- Staff — DECIDIDA

Gestão completa de membership na UI: role/position, ativar/desativar,
horários, vínculo serviço↔profissional; time-offs em fase 2.

### D3 --- Booking/Auth — DECIDIDA

Cliente autentica no final do booking via modal inline (login/cadastro
sem redirect, estado preservado). Correções acopladas: enviar
`clientName`/`clientPhone` no payload e alinhar contrato de slots
(mock vs `RawSlot`).

### D4 --- Appointment Actions — DECIDIDA

Ações por papel: OWNER/MANAGER todas; EMPLOYEE confirmar/completar as
próprias. Transições: `PENDING→CONFIRMED|CANCELLED`;
`CONFIRMED→COMPLETED|NO_SHOW|CANCELLED` (cancelar com motivo).

### D5 --- Agenda — DECIDIDA

Visão do cliente ("meus agendamentos") será sistema à parte em React
Native — fora do escopo web. `/me/agenda` não será criado no web.

### D6 --- Onboarding — PENDENTE (governança EOB)

Decisão delegada ao EOB. Até lá, não alterar `/onboarding` nem
`/businesses/new`.

## Mapa de dependências

``` text
Auth
 │
Business
 │
Location
 ├──────────────┐
 │              │
Staff        Services
 │              │
 └──────┬───────┘
        │
ProfessionalService
        │
WorkingHours / TimeOff
        │
Availability
        │
Slots
        │
Booking
        │
Appointment
        │
Agenda / Dashboard
```

Uma quebra no meio dessa cadeia pode bloquear várias telas mesmo que
estejam visualmente implementadas.

## Direção atual

A decisão atual é continuar pelo **frontend**.

Antes de novas implementações, deve ser reconstruída uma fotografia
técnica do estado atual do `agendaqui-web`, cobrindo:

-   arquitetura;
-   rotas;
-   auth;
-   business;
-   locations;
-   services;
-   staff;
-   booking;
-   appointments;
-   agenda;
-   settings;
-   onboarding;
-   API client;
-   tipos e contratos;
-   testes;
-   dívida técnica;
-   bloqueios backend.

O repositório atual deve ser tratado como fonte principal. Relatórios
antigos servem como contexto, mas não substituem a inspeção do código
vigente.

## Critério para próximas frentes

### ESTÁVEL

Implementado e validado. **Preservar.**

### FRONTEND INCOMPLETO E INDEPENDENTE

Pode ser concluído sem novo contrato backend. **Implementar.**

### DEPENDE DO BACKEND

Existe bloqueio de endpoint, autorização ou contrato. **Não improvisar
no frontend.**

### DEPENDE DE PRODUTO

O código não determina sozinho o comportamento correto. **Solicitar
decisão.**

### BUG CONFIRMADO

Existe evidência direta da causa. **Corrigir cirurgicamente.**

### DESCONHECIDO

Não há evidência suficiente. **Investigar antes de alterar.**

## Objetivo da próxima etapa

O objetivo não é simplesmente criar mais telas.

É elevar a maturidade do frontend fechando fluxos e contratos
parcialmente implementados, sem reabrir áreas estáveis.

``` text
INVESTIGAR
    ↓
DIAGNOSTICAR
    ↓
IDENTIFICAR DEPENDÊNCIAS
    ↓
DECIDIR
    ↓
IMPLEMENTAR
    ↓
REVISAR
    ↓
VALIDAR
```

As próximas frentes relevantes tendem a envolver **Staff,
multi-business, Booking/Auth, Appointment Actions, Agenda e integrações
frontend/backend**, sempre com investigação do estado atual antes de
alterações.

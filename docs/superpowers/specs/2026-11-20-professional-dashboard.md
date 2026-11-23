# Dashboards por Papel — Especificação

## Objetivo

Entregar dashboards distintas para usuários `EMPLOYEE` e `MANAGER`, sem misturar o papel de acesso (`OWNER`, `MANAGER`, `EMPLOYEE`) com o cargo textual (`position`, como recepcionista ou cabeleireiro). A visão do proprietário permanece a atual.

## Estado atual e motivação

- O `WorkspaceProvider` já resolve `activeMode === 'PROFESSIONAL'` para usuários com vínculo `EMPLOYEE`.
- `/dashboard` sempre renderizava a dashboard do proprietário, inclusive para gerentes.
- A API possui `GET /me/agenda`, mas hoje agrega vínculos de todos os negócios do usuário e consulta registros sem relações de cliente, serviço ou local.
- A página `/appointments` consome a listagem do negócio, endpoint que autoriza apenas proprietário/gerente.

## Decisões

1. A URL permanece `/dashboard`; `DashboardPage` escolhe a visão profissional pelo `activeMode` e a visão de gerente pelo papel do vínculo ativo.
2. O modo `PROFESSIONAL` mostra apenas informações de atendimento: resumo do dia, agenda do dia e próximos atendimentos. Não mostra faturamento nem ações de administração do negócio.
3. A consulta profissional é limitada no servidor ao `businessId` ativo e aos vínculos ativos do usuário autenticado naquele negócio. Não retorna agenda de outros negócios.
4. A resposta usa o contrato de `AppointmentResponse`, incluindo cliente, serviço, profissional e local, e mantém as ações já autorizadas para o funcionário em seus próprios atendimentos.
5. A rota `/appointments` também usa a consulta profissional no modo `PROFESSIONAL`, para o item “Agendamentos” não abrir uma listagem gerencial sem permissão. Os modos `OWNER` continuam usando a listagem atual.
6. No modo `PROFESSIONAL`, a navegação mostra Dashboard, Agendamentos e Ajuda; busca global e atalhos para criar/administrar negócio, local, serviço, equipe ou agendamento ficam ocultos.
7. Estados de carregamento, erro e agenda vazia terão tratamento explícito, seguindo os componentes existentes.
8. `MANAGER` ainda usa `activeMode === 'OWNER'` no contrato de sessão; `DashboardPage` e a navegação distinguem gerente pelo `activeMembership.role`.
9. A dashboard do gerente prioriza atendimentos do dia, confirmações pendentes e profissionais ativos, com acessos a agenda, equipe e serviços; não exibe faturamento nem configuração exclusiva do proprietário.

## Comportamento

- A dashboard do funcionário identifica o negócio ativo e consulta sua agenda entre o início de hoje e o fim dos próximos sete dias.
- O resumo destaca quantidade de atendimentos hoje e próximo atendimento.
- Os atendimentos de hoje aparecem em ordem cronológica, com horário, serviço, cliente, local e status.
- Os atendimentos futuros aparecem em uma lista compacta por data.
- Ações de confirmar e concluir continuam usando `AppointmentActions`; o componente só as habilita para o vínculo profissional do próprio agendamento.
- A tela de agendamentos mantém calendário e filtros existentes, mas no modo profissional lista apenas os vínculos do funcionário no negócio ativo.
- No modo profissional, a barra lateral e o calendário não oferecem atalhos para seções ou criação gerencial.
- O gerente recebe uma dashboard operacional e menu limitado a agenda, equipe, serviços e suporte; a busca global fica oculta.
- Nenhum endpoint retorna agenda de funcionário de outro negócio selecionado.

## Contrato de API proposto

`GET /me/agenda?businessId={id}&dateFrom={ISO}&dateTo={ISO}&limit={n}`

- Autenticação obrigatória.
- O servidor resolve vínculos ativos `EMPLOYEE` pertencentes ao usuário autenticado e ao negócio informado.
- Sem vínculo ativo no negócio, responder `403`.
- Consultar agendamentos desses vínculos no intervalo informado, em ordem cronológica, com relações necessárias à UI.
- Retornar `AppointmentResponse[]` pelo mapper já existente.
- Nunca confiar em um `employeeMembershipId` recebido do cliente para definir a identidade profissional.

## Arquivos esperados

### Frontend (`Agendaqui`)

- `src/pages/dashboard.tsx`: manter o conteúdo atual de gestão e encaminhar o modo profissional à nova visão.
- `src/pages/professional-dashboard.tsx` (novo): resumo e lista de atendimentos do funcionário.
- `src/pages/manager-dashboard.tsx` (novo): resumo operacional, agenda da equipe e atalhos autorizados ao gerente.
- `src/pages/appointments.tsx`: selecionar query profissional no modo correspondente e preservar comportamento de proprietário.
- `src/components/appointments/appointment-actions.tsx`: invalidar a query profissional depois de confirmar/concluir um atendimento.
- `src/components/layout/dashboard-layout.tsx`: limitar navegação e busca ao espaço profissional.
- `src/components/layout/dashboard-layout.tsx`: limitar navegação e busca para gerente às áreas de operação.
- `src/services/api/appointments.ts`: expor método tipado para a agenda profissional usando `AppointmentResponse` e o mapper atual.
- `src/lib/mock/handlers.ts`: dar suporte à rota profissional no mock e manter o mesmo escopo por usuário, vínculo e negócio.
- Tipos/componentes existentes serão reutilizados sempre que possível.

### API (`agendaqui-api`)

- Controller/query/handler da agenda profissional: receber e validar o escopo do negócio.
- Repositório de equipe: resolver vínculos ativos do usuário dentro do negócio.
- Repositório de agendamentos: consultar por vínculo profissional com relações necessárias à resposta.
- Mapper/resposta: reutilizar `toAppointmentResponses` e os contratos de appointment existentes.

## Fora de escopo

- Horários de trabalho, folgas e férias.
- Relatórios de comissão, pagamento ou faturamento.
- Perfil pessoal do funcionário.
- Mudanças na autorização de outras ações de agendamento.
- Notificações em tempo real.

## Critérios de aceite

1. Em modo `PROFESSIONAL`, `/dashboard` não mostra métricas nem atalhos gerenciais.
2. O funcionário só recebe atendimentos ligados aos próprios vínculos ativos no negócio selecionado.
3. Os cartões/listas mostram nome do cliente, serviço, local, data, horário e status disponíveis.
4. Funcionário pode executar apenas as ações já autorizadas para os próprios atendimentos.
5. Em modo `OWNER`, a dashboard e a agenda mantêm o comportamento atual.
6. Sem vínculo ou atendimentos no período, há estado vazio claro; erros e carregamento não aparecem como agenda vazia.
7. A dashboard do `MANAGER` não exibe métricas financeiras e oferece apenas atalhos de operação.

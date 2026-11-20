# Retenção do histórico de chamados do cliente

## Intenção

Limitar por quanto tempo cada cliente vê seus chamados antigos, sem remover o histórico operacional da central de suporte nem apagar avaliações usadas pelo ranking.

## Comportamento escolhido

- Contar 7 dias a partir do encerramento do chamado (`closedAt`).
- Depois dos 7 dias, o chamado e a conversa deixam de aparecer e de ser acessíveis pelas consultas da conta do cliente.
- A central `/support` mantém o chamado e a conversa para consulta operacional.
- A avaliação permanece ligada ao atendente e continua compondo o ranking.
- Chamados em `OPEN`, `IN_PROGRESS` ou `RESOLVED` não expiram; `RESOLVED` permanece visível até o cliente avaliar e o chamado ficar `CLOSED`.
- Não apagar registros nem mensagens do banco nesta mudança.

## Abordagens consideradas

1. Ocultar da conta do cliente após 7 dias e preservar chamado, chat e avaliação para suporte/ranking. **Escolhida pelo usuário**; atende ao prazo sem apagar histórico de trabalho nem alterar o ranking.
2. Apagar chamado e conversa globalmente, mantendo somente uma nota anônima para o ranking. Exigiria mudar relações e política de exclusão.
3. Apagar chamado, conversa e avaliação globalmente. Simplifica retenção, mas remove o histórico do suporte e afeta o ranking.

## Implementação proposta

- Centralizar o limite de retenção como 7 dias em uma consulta reutilizável da API.
- Aplicar a regra às rotas do cliente que listam ou abrem chamados e consultam mensagens, para que esconder a linha não deixe o recurso acessível por URL/ID.
- Não aplicar a regra às rotas protegidas da central `/support` nem ao ranking.
- Usar o `closedAt` já existente. Não é necessária migração nem rotina de exclusão.
- O cliente continua podendo abrir novos chamados após a expiração de itens antigos.

## Validação

- Fechado há menos de 7 dias: aparece e permanece acessível ao cliente.
- Fechado há mais de 7 dias: ausente da lista e inacessível pelas rotas de chamado/mensagens para o cliente.
- Aberto, em atendimento ou aguardando avaliação: permanece visível.
- Suporte continua consultando o histórico e a avaliação continua no ranking.
- Testar o limite exato de 7 dias e chamadas com fuso/UTC; não apagar nem alterar dados de produção durante a validação.

# Avaliação do suporte e ranking

## Intenção

Manter a conversa do cliente acessível quando o atendente finalizar o chamado, pedir uma nota de 1 a 5 estrelas e associar essa avaliação à conta do atendente responsável. A equipe de suporte poderá consultar um ranking baseado nas avaliações recebidas.

## Objetivos

- O chamado permanece `RESOLVED` e a conversa continua visível até o cliente avaliar.
- A pessoa escolhe a nota antes de enviá-la; as estrelas selecionadas aparecem preenchidas.
- Uma avaliação por chamado, vinculada ao chamado, solicitante e atendente designado.
- Depois de registrar a nota, o chamado passa a `CLOSED` e a conversa mostra confirmação.
- A dashboard `/support` mostra atendentes ordenados pela média, junto da quantidade de avaliações.
- A mensagem de avaliação continua no histórico do chat, mas o registro estruturado é a fonte do ranking.

## Fora do escopo

- Comentários escritos junto da nota.
- Reabrir chamados encerrados ou alterar notas depois do envio.
- Aplicar a migração ao banco de produção nesta tarefa.
- Incorporar avaliações antigas armazenadas apenas como texto ao ranking.

## Abordagens consideradas

1. Extrair notas das mensagens do chat. Evita migração, mas texto não é um contrato confiável para relatórios e permite inconsistências.
2. Criar um registro estruturado `SupportRating` ligado ao chamado, solicitante e atendente. Requer migração, mas impõe uma nota única por chamado e permite calcular médias e totais com segurança. **Escolhida.**

## Comportamento e implementação

- O endpoint de avaliação valida que o solicitante é dono do chamado, o estado é `RESOLVED`, a nota é de 1 a 5 e o chamado ainda não tem avaliação.
- Em uma transação, cria a avaliação, registra a mensagem no chat e muda o chamado para `CLOSED`.
- O cliente seleciona de 1 a 5 estrelas, vê as estrelas até a nota escolhida preenchidas e confirma em um botão separado. Enquanto não confirmar, pode alterar a seleção e a conversa não se fecha automaticamente.
- O endpoint da fila de suporte fornece o ranking agregado por atendente (média e quantidade), ordenado pela média e depois pelo total de avaliações. A dashboard apresenta os nomes, médias e totais.
- A migração adiciona a tabela e as relações Prisma necessárias. A migração será gerada e revisada, mas não aplicada a produção.

## Restrições e validação

- Manter o chat acessível nos estados `RESOLVED` e `CLOSED`; permitir envio de mensagens somente enquanto `IN_PROGRESS`.
- Não registrar duas notas para o mesmo chamado, inclusive em submissões concorrentes.
- Validar com builds frontend/API e testes de fluxo: seleção/cancelamento da nota, nota salva no atendente correto, ranking/média, estados do chamado, duplicidade e permissões. Não usar chamados reais para simular a avaliação.

## Decisões de implementação

- Uma tabela relacional é a fonte da avaliação; a mensagem no chat preserva o histórico visível.
- O ranking fica na dashboard existente `/support`.
- Não executar `prisma migrate deploy` ou qualquer gravação de migração no banco configurado como produção.

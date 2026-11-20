# Contas na central de suporte

## IntenÃ§Ã£o

Separar a localizaÃ§Ã£o de contas da fila de chamados e permitir que suporte encontre uma pessoa pelo nome ou e-mail, consulte seus dados bÃ¡sicos e solicite o fluxo de redefiniÃ§Ã£o de senha.

## Comportamento aprovado

- Adicionar uma seÃ§Ã£o/rota **Contas** Ã  navegaÃ§Ã£o do suporte, separada da dashboard de chamados.
- Exibir um seletor com resultados paginados e busca por nome ou e-mail; nÃ£o enviar a lista completa de contas ao navegador.
- Cada resultado mostra nome, e-mail e nomes dos negÃ³cios associados, incluindo negÃ³cios de que a pessoa Ã© proprietÃ¡ria ou funcionÃ¡ria.
- Ao selecionar uma pessoa, permitir solicitar redefiniÃ§Ã£o de senha. O servidor envia o cÃ³digo existente de recuperaÃ§Ã£o ao e-mail cadastrado.
- A pessoa usa o cÃ³digo no fluxo jÃ¡ existente para escolher a prÃ³pria senha. O suporte nunca recebe o cÃ³digo nem define uma senha.
- A operaÃ§Ã£o Ã© restrita ao papel `SUPPORT`; registrar o atendente que iniciou a solicitaÃ§Ã£o e a conta alvo sem registrar cÃ³digo ou credencial.
- A busca exclui contas removidas logicamente (`deletedAt` preenchido), mas pode exibir os demais status da conta.

## Abordagens consideradas

1. Busca paginada por nome/e-mail e reutilizaÃ§Ã£o do cÃ³digo atual de recuperaÃ§Ã£o. **Escolhida pelo usuÃ¡rio**; limita dados expostos e reaproveita o fluxo de senha com verificaÃ§Ã£o por e-mail.
2. Carregar todas as contas para um seletor local. Mais simples, mas expÃµe todos os e-mails ao navegador e nÃ£o escala.
3. Enviar uma senha temporÃ¡ria vÃ¡lida por e-mail. NÃ£o escolhida: cria uma credencial de acesso por e-mail e exigiria um fluxo novo de troca obrigatÃ³ria.

## ImplementaÃ§Ã£o proposta

- Criar endpoint de busca protegido por `@Roles(AdminLevel.SUPPORT)`, paginado e limitado, que aceita termo de nome/e-mail e retorna apenas campos mÃ­nimos e os nomes dos negÃ³cios relacionados.
- Manter a tela `/support` focada em chamados e adicionar a rota/nav **Contas**.
- Criar endpoint protegido que solicita redefiniÃ§Ã£o para o usuÃ¡rio selecionado reutilizando `ForgotPasswordCommand`/serviÃ§o atual; responder sem retornar existÃªncia de tokens/cÃ³digos.
- Registrar ator e alvo no mecanismo de auditoria jÃ¡ usado pelo projeto, sem dados secretos.
- A taxonomia de auditoria usa enums Prisma; preparar a migraÃ§Ã£o aditiva para a nova aÃ§Ã£o/entidade, mas nÃ£o aplicÃ¡-la ao banco de produÃ§Ã£o nesta tarefa.
- Remover o bloco â€œLocalizar contaâ€ da dashboard e substituir por acesso Ã  seÃ§Ã£o Contas.

## Fora do escopo

- O suporte editar perfil, bloquear conta ou alterar a senha diretamente.
- Mostrar CPF, telefone, documentos ou conteÃºdo privado alÃ©m de nome, e-mail, status e negÃ³cios relacionados.
- Criar uma senha temporÃ¡ria ou forÃ§ar o cliente a trocar senha no login.

## ValidaÃ§Ã£o

- Apenas SUPPORT pode buscar contas ou solicitar redefiniÃ§Ã£o.
- PaginaÃ§Ã£o/busca retorna correspondÃªncias por nome e e-mail, sem contas removidas logicamente.
- NegÃ³cios prÃ³prios e de associaÃ§Ã£o profissional aparecem com os nomes corretos.
- Solicitar redefiniÃ§Ã£o envia o fluxo/cÃ³digo existente ao e-mail cadastrado e nÃ£o revela token/cÃ³digo ao atendente.
- O cliente conclui pelo fluxo atual e define a nova senha; registros de auditoria identificam ator/alvo sem segredos.
- NavegaÃ§Ã£o separa dashboard e Contas; a dashboard deixa de conter o campo de busca.

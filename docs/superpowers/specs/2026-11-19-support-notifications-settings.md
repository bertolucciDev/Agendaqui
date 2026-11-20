# Sino e configurações do suporte

## Objetivo

Dar ao atendente acesso rápido a chamados aguardando atendimento e permitir que gerencie seu perfil e o alerta sonoro na própria área de suporte.

## Escopo aprovado

- Um sino no canto superior direito da área de suporte lista chamados `OPEN`, mostra a quantidade aguardando e abre a conversa selecionada.
- A lista é alimentada pela fila já existente e atualizada por Socket.IO. Ela não mantém estado de lida/não lida e não cria registros de notificação.
- A rota `/support/settings` reutiliza a tela de configurações existente para nome, telefone, e-mail com confirmação e segurança; adiciona o controle persistente do som de novo chamado.
- A preferência de som é local ao navegador. O browser só libera reprodução de áudio após gesto do usuário; com o som habilitado, a primeira interação na área de suporte prepara o áudio.

## Fora de escopo

- Notificações persistidas, estado individual de leitura, push/email e histórico de notificações.
- Upload ou alteração de foto de perfil (não há endpoint de perfil/foto no projeto atualmente).
- Alterações de API, banco de dados ou storage.

## Comportamento

- O sino mostra até cinco chamados aguardando; o badge usa o total `OPEN` retornado pela API.
- Eventos de novo chamado e mudança de chamado invalidam a consulta do sino.
- Selecionar um chamado navega a `/support?ticketId=<id>` e abre o modal existente.
- Fechar o modal remove `ticketId` da URL.
- A configuração de som fica salva em `agendaqui:notifications` e controla o beep no evento `support:ticket-created`.

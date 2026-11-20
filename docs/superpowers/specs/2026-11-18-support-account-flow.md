# Fluxo da conta de suporte

## Objetivo

Dar à conta `SUPPORT` uma área própria para localizar uma conta de usuário e consultar dados mínimos para atendimento, sem conceder acesso às telas ou ações administrativas.

## Decisões

- A conta de suporte entra em `/support`; contas `ADMIN` e `SUPER_ADMIN` permanecem em `/admin`; usuários comuns continuam em `/dashboard`.
- O perfil de plataforma é obtido por `GET /me/admin-profile`, pois `GET /me/session` informa somente `isPlatformAdmin`.
- A área de suporte terá layout e dashboard próprios.
- O MVP permite procurar uma conta por e-mail exato, por `POST /support/users/lookup`.
- O resultado é somente leitura e contém `id`, `name`, `email`, `status` e `createdAt`. Não retorna telefone ou dados de negócio.
- Somente o papel `SUPPORT` acessa essa consulta. Não há aprovação, alteração, leitura de documentos de verificação ou gestão de pedidos de privacidade.
- A consulta devolve `null` quando não há correspondência; não cria nem altera dados.

## Fluxo

`Login → Session (isPlatformAdmin) → AdminProfile (level) → Role Guard → /support → busca exata por e-mail → conta resumida ou estado sem resultado`

## Limites

Chamados, alteração/bloqueio de conta, redefinição de credenciais e consulta de negócios ficam fora deste MVP.

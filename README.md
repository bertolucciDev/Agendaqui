# Agendaqui

Aplicação web da plataforma Agendaqui para descoberta e agendamento de serviços. O workspace de desenvolvimento mantém este frontend separado da API NestJS em `../agendaqui-api`.

## Stack

- React 19, TypeScript e Vite 6
- React Router para navegação
- TanStack Query e Axios para consultas e integração HTTP
- Vitest e Testing Library para testes de interface e serviços

## Executar localmente

1. Configure as variáveis locais a partir de `.env.example`; não versione `.env` nem credenciais.
2. Inicie a API Agendaqui em ambiente de desenvolvimento isolado.
3. Execute `npm run dev` para usar a configuração corrente. O proxy `/agendaqui-api` usa `VITE_API_PROXY_TARGET` quando definida; caso contrário, aponta para a API hospedada.
4. Abra a URL local indicada pelo Vite.

`VITE_USE_MOCK=true` ativa os adapters locais de demonstração/teste. Para integração com API real, use `VITE_USE_MOCK=false` e um alvo de API apropriado. Evite apontar testes ou cadastros de demonstração para banco de produção.

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor local Vite |
| `npm run dev:real` | Servidor Vite com adapters mock desativados |
| `npm run typecheck` | Verificação TypeScript |
| `npm test` | Suítes Vitest |
| `npm run build` | Build de produção |
| `npm run check:contract` | Confere caminhos de API usados no frontend contra as rotas do backend |

## Escopo funcional

O frontend contém fluxos de cadastro/autenticação, negócio e verificação, agenda, serviços, unidades, equipe, painéis admin e suporte, ajuda/chat, configurações e as telas de funcionário/gerente/PDV em evolução. Consulte o código e os testes para distinguir funcionalidades implementadas de fluxos integrados já validados.

## Preparação do TCC

O roteiro de demonstração, a matriz mínima de validação, os resultados desta revisão e as pendências de integração estão em [TCC-readiness.md](../agendaqui-api/docs/TCC-readiness.md). Essa revisão é condicional: os testes/builds locais passaram, mas ela não comprova um fluxo real completo no navegador.

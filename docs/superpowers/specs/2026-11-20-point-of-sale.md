# PDV por unidade — Especificação

## Objetivo

Permitir que funcionários e gerentes registrem vendas de produtos físicos no local onde trabalham. O dono administra o catálogo e o estoque de cada unidade. Uma venda concluída registra os itens e baixa as quantidades do estoque de forma atômica.

## Estado atual e motivação

- A aplicação possui cadastro de serviços e agendamentos, mas não possui catálogo de produtos, controle de estoque nem registro de vendas.
- O `EmployeeMembership` vincula usuário, papel e unidade (`Location`). Os papéis disponíveis incluem `EMPLOYEE` e `MANAGER`.
- O funcionário usa `activeMode === 'PROFESSIONAL'`; o gerente permanece no modo de negócio e é identificado por `activeMembership.role === 'MANAGER'`.
- A sidebar já é específica para funcionário, gerente e dono. A nova seção deve respeitar esses espaços e o vínculo ativo.
- Negócios podem ter várias unidades, portanto o catálogo pode ser compartilhado enquanto o saldo físico fica separado por unidade.

## Integração com o negócio

O banco e a API já possuem `Business.sellsProducts`. Reutilizar esse campo como ativação do PDV, sem criar uma segunda configuração. A tela **Produtos** do dono permite ativá-lo. A aba do funcionário/gerente aparece apenas quando a flag está ativa e existe ao menos um produto ativo; o backend valida a flag na consulta de catálogo e no checkout.

## Abordagens consideradas

1. **Catálogo por negócio e estoque por unidade — escolhida.** O dono cadastra produtos uma vez e informa a quantidade disponível em cada unidade. Funcionários e gerentes vendem no local do vínculo ativo. Atende lojas com filiais sem duplicar o cadastro.
2. **Catálogo e estoque compartilhados por negócio.** Mais simples de implementar, mas uma venda em uma filial poderia consumir saldo de outra.
3. **Registro de venda sem estoque.** Entrega checkout mais simples, mas não controla a disponibilidade dos produtos físicos.

## Decisões

1. Produto pertence ao negócio; saldo pertence ao par produto/unidade.
2. O dono cria, edita e ativa/desativa produtos e registra entradas ou ajustes de estoque por unidade. Funcionários e gerentes não editam catálogo nem ajustam estoque.
3. Funcionários (`EMPLOYEE`) e gerentes (`MANAGER`) podem abrir o PDV e registrar vendas na unidade do vínculo ativo. O servidor deriva o vendedor do usuário autenticado e valida o vínculo e a unidade; não confia no papel ou no vendedor informados pelo cliente.
4. A aba PDV aparece para funcionário e gerente quando o negócio tem pelo menos um produto ativo. Ela continua disponível mesmo que o saldo da unidade esteja zerado, para mostrar indisponibilidade e não esconder a causa.
5. A tela lista produtos ativos com preço e saldo da unidade, permite montar carrinho e concluir a venda com pagamento em dinheiro, crédito, débito ou Pix. Nesta etapa o pagamento é somente registrado; não há integração com adquirente ou cobrança online.
6. Uma venda é concluída em uma transação do banco: valida produtos e quantidades, verifica saldo, cria venda e itens com snapshots de nome/preço e registra os movimentos de saída. Qualquer falha reverte toda a operação.
7. O estoque não pode ficar negativo. Atualizações condicionais de saldo e transação impedem duas vendas concorrentes de consumirem a mesma última unidade.
8. Cada entrada/ajuste e venda gera movimento auditável com unidade, produto, quantidade, motivo, autor e data.
9. O dono consulta produtos, saldos e histórico de vendas do negócio. A tela de confirmação do funcionário/gerente mostra itens, total e forma de pagamento; a consulta não expõe dados pessoais do cliente, pois o cliente não é obrigatório para uma venda presencial.
10. O design segue a arquitetura modular existente e acrescenta modelos, módulo/API e telas tipadas. A migração é criada para revisão; não é aplicada automaticamente em produção.

## Fluxos

### Cadastro e estoque do dono

1. O dono abre **Produtos** na sidebar.
2. Cadastra nome, preço e, opcionalmente, SKU/descrição.
3. Informa estoque inicial por unidade e usa ações de entrada/ajuste para movimentações futuras.
4. Consulta saldo e vendas registradas no negócio.

### Venda do funcionário ou gerente

1. O usuário abre **PDV** na sidebar, disponível quando há catálogo ativo no negócio.
2. O sistema carrega produtos ativos e saldo da unidade autorizada pelo vínculo ativo.
3. O usuário adiciona quantidades ao carrinho e seleciona uma forma de pagamento.
4. Ao concluir, o backend valida permissão, negócio, unidade, preço atual e estoque, e grava a venda e baixa de estoque atomicamente.
5. A tela apresenta confirmação com total e itens vendidos. Se o estoque mudou ou não for suficiente, nenhuma parte da venda é gravada e a tela informa o item sem saldo.

## Modelo de dados proposto

- `Product`: negócio, nome, SKU opcional, descrição opcional, preço em centavos, ativo e datas de auditoria.
- `LocationInventory`: produto, unidade, quantidade inteira não negativa; unicidade por produto/unidade.
- `Sale`: negócio, unidade, vínculo vendedor, total em centavos, forma de pagamento e data.
- `SaleItem`: venda, referência opcional ao produto e snapshots de nome/preço, quantidade e subtotal. Snapshots preservam o histórico se o produto mudar ou for desativado.
- `InventoryMovement`: produto/unidade, tipo de movimento, quantidade, saldo resultante, autor, vínculo com venda quando aplicável e data.

Valores monetários ficam em centavos. Exclusão física de produto vendido não é permitida; o produto é desativado.

## Contrato de API proposto

- `GET/POST /businesses/:businessId/products`: catálogo e criação, restritos ao dono.
- `PATCH /businesses/:businessId/products/:productId`: alteração/ativação, restrita ao dono.
- `GET /businesses/:businessId/inventory?locationId=...`: consulta de saldo por unidade, restrita ao dono.
- `POST /businesses/:businessId/inventory/movements`: entrada/ajuste, restrito ao dono e com motivo.
- `GET /me/pos/catalog?businessId=...`: catálogo ativo e saldo da unidade resolvida por vínculo ativo de funcionário/gerente.
- `POST /me/pos/sales`: itens e forma de pagamento; vendedor, negócio/unidade e permissões são resolvidos e validados no servidor.
- `GET /businesses/:businessId/sales`: histórico de vendas do negócio, restrito ao dono, com paginação e filtros básicos por unidade/período.

Respostas usam os envelopes e DTOs existentes da API. Identificadores recebidos do cliente são sempre validados contra o negócio/unidade e o usuário autenticado.

## Fora de escopo da primeira entrega

- Nota fiscal, NFC-e, tributação e impressão fiscal.
- Integração com adquirente, Pix dinâmico, gateway ou confirmação automática do pagamento.
- Devolução, estorno, cancelamento de venda ou reabertura de caixa.
- Compras de fornecedor, ordens de compra, alertas automáticos de estoque baixo e inventário por código de barras.
- Comissão por venda, múltiplos caixas/turnos, descontos e venda a prazo.

## Critérios de aceite

1. Dono pode cadastrar/editar/desativar produto e ajustar saldo em cada unidade; a edição de preço não altera snapshots de vendas anteriores.
2. Funcionário e gerente podem consultar o catálogo e vender apenas na unidade coberta pelo vínculo ativo.
3. Funcionário/gerente não conseguem criar produto, ajustar estoque nem acessar vendas de outro negócio manipulando a requisição.
4. Catálogo sem produto ativo não mostra a aba PDV; produto ativo com saldo zero continua visível e indisponível para venda naquela unidade.
5. Venda válida cria registro, itens e movimentos e reduz o saldo uma única vez.
6. Estoque insuficiente ou venda concorrente não deixa saldo negativo nem grava venda parcial.
7. Produtos e vendas de outra unidade/negócio não aparecem nem podem ser usados na venda.
8. API e UI tratam carregamento, erro, catálogo vazio, carrinho vazio, estoque insuficiente e conclusão com mensagens claras.
9. Os valores são calculados no servidor a partir do preço atual, sem confiar em totais enviados pelo navegador.

## Arquivos esperados

### Frontend (`Agendaqui`)

- Layout/sidebar e roteamento: item **PDV** condicionado ao papel e existência de catálogo ativo; item **Produtos** para dono.
- Serviço tipado de PDV e produtos/inventário, integrado ao cliente HTTP e ao cache TanStack Query existente.
- Tela do PDV para busca/seleção de produto, carrinho, forma de pagamento, confirmação e estados vazios/erro.
- Tela de gestão de produtos/estoque e histórico básico de vendas para o dono.
- Mock/handlers alinhados ao contrato real para desenvolvimento offline.

### API (`agendaqui-api`)

- Modelos Prisma e migration para produto, saldo, venda, itens e movimentos de estoque.
- Módulo de catálogo/estoque e módulo de vendas, com DTOs, autorização por usuário/negócio/unidade, handlers e repositórios.
- Transação atômica que valida o vínculo ativo, disponibilidade e quantidade antes de gravar a venda.
- Paginação do histórico e índices/constraints para unicidade e integridade do saldo.

## Limites e itens deixados ao implementador

- Usar o sistema atual de autenticação, escopo de workspace, arquitetura NestJS e estilos/componentes existentes.
- Aplicar a migration somente em ambiente local/dev durante implementação; qualquer aplicação em produção exige decisão separada.
- Não criar campo de cliente obrigatório nem persistir PII em venda presencial sem requisito.

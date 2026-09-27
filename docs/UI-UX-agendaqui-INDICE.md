# Padrão de organização — UI/UX Agendaqui

## Convenção de nomes

Cada demanda deve ser empacotada separadamente:

`UI-UX-agendaqui-D<N>-<slug>.zip`

Exemplos:
- `UI-UX-agendaqui-D1-investigacao.zip`
- `UI-UX-agendaqui-D2-triagem-priorizacao.zip`
- `UI-UX-agendaqui-D3-<melhoria-aprovada>.zip`

## Regra de governança

- D1 investiga.
- D2 revisa e prioriza o retorno de D1.
- D3+ só são criadas depois de existirem evidências suficientes e aprovação EOB.
- Não criar uma demanda de implementação apenas porque uma melhoria “parece boa”.
- Cada ZIP deve conter contexto, objetivo, restrições, critérios de aceitação e template de retorno.

## Demandas criadas agora

| Código | Arquivo | Estado |
|---|---|---|
| D1 | UI-UX-agendaqui-D1-investigacao.zip | Pronta para execução |
| D2 | UI-UX-agendaqui-D2-triagem-priorizacao.zip | Executar somente após receber o RETURN da D1 |

## Próximas demandas

D3+ não foram criadas ainda por decisão de governança: dependem das evidências de D1 e da triagem de D2.

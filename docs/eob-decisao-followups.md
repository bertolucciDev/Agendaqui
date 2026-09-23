# EOB — Decisão sobre Follow-ups Pendentes

- **Data:** 2026-09-21
- **Contexto:** correção dos 40 erros TS concluída e aprovada (typecheck/build/lint exit 0; validação funcional 9/9 — ver `eob-validacao-funcional-40-erros.md`). Os itens abaixo são bugs **pré-existentes**, fora do escopo daquela correção, apresentados para decisão de priorização.
- **Restrição vigente:** itens marcados como "com fragilidade" não foram abertos por segredo de implementação; custos estimados em horas-dev.

## Fila de decisão

| # | Item | Arquivo:linha | Impacto | Esforço | Risco de NÃO fazer |
|---|------|--------------|---------|---------|--------------------|
| F1 | Booking: dead-end de seleção de data (grade só renderiza com `selectedDate` setado; nenhum efeito o inicializa) | `src/pages/booking/index.tsx:63,70,152` | Alto — cliente NÃO consegue agendar em sessão nova | Médio (2–4h): definir default da data no estado ou efeito; ajustar `prevWeek`/`nextWeek` | Alto — função principal do produto inutilizável |
| F2 | Settings: campo nome inicia vazio e nunca é populado após fetch | `src/pages/settings.tsx:56` | Médio — UX confusa (form "parece que esqueceu" o nome) | Baixo (0,5–1h): popular via `useEffect`/watch de `user` | Baixo — cosmético |
| F3 | businesses.new: submit vazio mostra mensagem zod default (`Invalid input: expected string, received undefined`) em vez de `CPF/CNPJ inválido`/`CEP inválido` | `src/pages/businesses.new.tsx` | Médio — validação confusa para o usuário | Baixo (1h): inicializar campos controlados ou usar `register` | Baixo — cosmética |
| F4 | Fragilidade a payload nulo: crash (ErrorBoundary) se a API devolver `null` | `staff.new.tsx:145`, `services.tsx:90` | Baixo — só ocorre com resposta anômala; API real devolve array | Baixo (1h): guardar com `?? []` | Baixo — defensivo |

## Opções por item

1. **CORRIGIR AGORA** — resolver em follow-up dedicado.
2. **AGENDAR** — entrar no backlog com prioridade definida.
3. **NAO CORRIGIR** — aceitar como está (justificar).

## Recomendação

- F1: **CORRIGIR AGORA** — bloqueia a jornada principal de agendamento.
- F2/F3: **AGENDAR** em lote de UX rápido (baixo esforço, ganho perceptível).
- F4: **AGENDAR** junto com F2/F3 (defensivo, barato).

## Decisão EOB

- [ ] Deferir tudo (manter como está)
- [ ] Aprovar recomendação (F1 agora; F2/F3/F4 em lote)
- [ ] Outra combinação — descrever:

```
F1: CORRIGIR_AGORA / AGENDAR / NAO_CORRIGIR
F2: CORRIGIR_AGORA / AGENDAR / NAO_CORRIGIR
F3: CORRIGIR_AGORA / AGENDAR / NAO_CORRIGIR
F4: CORRIGIR_AGORA / AGENDAR / NAO_CORRIGIR
```

Assinatura: `________`  Data: `________`
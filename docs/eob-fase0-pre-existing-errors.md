# Relatório EOB — Erros TypeScript pré-existentes (não-Fase 0)

> **De:** Frontend Agendaqui · **Para:** EOB · **Data:** 2026-09-21
> **Status:** APÓS correção dos 6 erros da Fase 0, restam **40 erros TS pré-existentes — 0 novos. Backend não é necessário: os erros são 100% frontend/tipos.**

---

## 1. Contexto

`npm run typecheck` agora usa `tsc -b` (paridade com build) — deixou de ser falso-verde.
Resultado atual: **40 erros pré-existentes**, zero relacionados à Fase 0, zero novos.
Estes 40 erros impedem `npm run build` (vite build não roda porque `tsc -b` falha primeiro).

## 2. Classificação dos 40 erros por padrão

| Padrão | Qtd | Mensagem | Arquivos |
|---|---|---|---|
| TS2322 — `string` → `boolean` | 23 | "Type 'string' is not assignable to type 'boolean'". Provavelmente `checked={campo}` onde `campo` é string, ou valor de checkbox | businesses.new, register, settings, services.new, staff.new, login |
| TS2322 — `InputProps` incompatível | 8 | Objeto com `{label, placeholder, type, value, onChange}` não atribuível a `IntrinsicAttributes & InputProps` | businesses.new:183/275, booking:385/391 |
| TS2339 — `latitude`/`longitude` | 2 | Tipo do formulário não inclui `latitude` e `longitude` | businesses.new:57-58 |
| TS2339 — `register` em `AuthContextType` | 1 | Type não tem método `register` | register:14 |
| TS2345 — `SubmitHandler` incompatível | 2 | `(data: BusinessFormData) => void` não atribuível a `SubmitHandler<TFieldValues>` | businesses.new:133/217 |
| TS6133 — import não usado | 4 | `User`, `Phone`, `Users`, `CalendarDays`, `Loader2`, `Check` | home, login, forgot-password, staff, booking, businesses.new |

> Nota: alguns arquivos acumulam 2+ padrões (ex.: businesses.new = 17 erros).

## 3. Distribuição por arquivo (40 erros)

```
src/pages/businesses.new.tsx    17  (Resolver/lat-long/checked/InputProps/handleSubmit)
src/pages/register.tsx           5  (register em AuthContextType + checked)
src/pages/booking/index.tsx      4  (User/Phone sem uso + InputProps)
src/pages/settings.tsx           3  (checked boolean)
src/pages/services.new.tsx       3  (checked boolean)
src/pages/login.tsx              3  (Loader2 sem uso + checked)
src/pages/staff.new.tsx          2  (checked boolean)
src/pages/staff.tsx              1  (Users sem uso)
src/pages/home.tsx               1  (Check sem uso)
src/pages/forgot-password.tsx    1  (CalendarDays sem uso)
```

## 4. Causas prováveis (para EOB analisar/dirigir)

### C1 — TS2322 string→boolean (23 erros, 5 arquivos)
**Hipótese técnica:** campos renderizados em `<input type="checkbox">` / `<Switch>` / `<Checkbox>`
utilizam `checked={valores[item]}` onde a fonte é string (`FormData.set("ativo", valorString)`),
ou o formulário lida com o valor como texto e o componente espera `boolean`.
É o erro **maioritário** (23/40).

**Causa raiz (PROVÁVEL):** o tipo de entrada (schema/form values / `useState`) declara o campo
como `string`, porém o componente `checked` exige `boolean`. No caso de `select`/`radio`, é o
uso de `checked={`${idade} === 'mais'`}` sem operador de comparação boolean (retorna string) —
exatamente o padrão em `businesses.new.tsx` e `settings.tsx`.

**Para EOB:** decidir a política: (a) normalizar no controle (converter `String→boolean` no
handler), ou (b) mudar o tipo/componente. **Backend não participa.**

### C2 — TS2322 InputProps (8 erros, 2 arquivos)
**Hipótese técnica:** os componentes de input `{label, placeholder, type, value, onChange}`
não correspondem à assinatura de `InputProps` do design-system (o componente `Input` locl).
Provavelmente os handlers esperam `boolean` (`checked`) mas enviam `string`.

**Para EOB:** auditar o componente `Input` (provavelmente `src/components/ui/input`) e alinhar
os campos usados pelas páginas com a assinatura real. **Backend não participa.**

### C3 — TS2339 latitude/longitude (2, businesses.new)
**Hipótese técnica:** a página delimita as coordenadas (provavelmente preenchidas via geolocalização),
mas a tipagem do formulário (interface do resolver) **não declara** `latitude: number` /
`longitude: number`. Os campos existem no form, faltam no tipo.

**Para EOB:** incluir `latitude?`/`longitude?` no tipo do form (provavelmente `BusinessFormData`).
**Backend não participa** (payload espera numbers opcionais, já enviamos).

### C4 — TS2339 register em AuthContextType (1)
**Hipótese técnica:** `register.tsx` chama `auth.register(...)`, mas `src/app/providers/auth.tsx`
(ou o tipo consumido) não define `register` na interface — os fluxos usam `login`/`signup`.
**Candidato a incongruência de contrato FE** — precisa EOB decidir se é implementação faltante
(comportamento) ou tipificação.

**Para EOB:** decidir se `register` deve existir (novo método) ou o tipo deve apontar para
o fluxo existente (`login` pós-`/users`).

### C5 — TS2345 SubmitHandler (2)
**Hipótese técnica:** `handleSubmit(onSubmit)` com `onSubmit(data: BusinessFormData)` não bate
com `SubmitHandler<TFieldValues>`. Em geral é o **resolver do RHF** com tipos divergentes
(zodResolver schema vs. infer). Correlaciona com C3 (schema = tipo do form).

**Para EOB:** alinhar o tipo do resolver (zod) com o tipo do formulário, e depois C3 e C5
**resolvem juntos** — provavelmente a mesma raiz (tipagem do schema ausente de lat/long).

### C6 — TS6133 imports não usados (6)
**Hipótese técnica:** imports órfãos (provavelmente introduzidos durante refactor da Fase 0
remoto a partir de estado anterior ao fix). São triviais de remover, sem impacto em contrato.

**Para EOB:** remoção pura (limpeza), sem decidir nada. **Backend não participa.**

## 5. Correlação arquivos ↔ causas

| Arquivo | Causas prováveis |
|---|---|
| businesses.new.tsx | C1+C2+C3+C5 (resolver + checked + lat/long + InputProps) — mais crítico (17) |
| register.tsx | C4 + C1 |
| settings.tsx / services.new.tsx / staff.new.tsx | C1 apenas |
| login.tsx | C1 + C6 |
| booking/index.tsx | C2 + C6 |
| home / staff / forgot-password | C6 apenas |

## 6. Recomendação de solução a discutir com EOB

1. **C6 (6 erros):** remoção pura de imports — baixa criticidade, sem risco.
2. **C1 (23 erros):** definir que `checked` mapeie `String→boolean` (guard `=== 'true'`/`Boolean(value)`),
   ou que o controle convoque com `checked={formValue === 'x'}` — padrão único. Migração mecânica.
   Vigência: páginas de formulário somente (FE).
3. **C3+C5 (4 erros):** corrigir tipagem do schema do RHF (incluir `latitude?`/`longitude?`).
   **Backend inalterado — payload já aceita numbers opcionais.**
4. **C4 (1 erro):** decidir se `AuthContextType` adiciona `register`.
5. **C2 (8 erros):** auditar componente `Input` locl (design-system) e alinhar assinatura.

## 7. Impacto de não corrigir

- `npm run build` fica impedido (vite build nunca roda; `tsc -b` barra).
- `npm run typecheck` fica vermelho (agora legítimo).
- Comportamento em runtime: provável bug latente nos campos `checked` em `businesses.new`,
  `settings`, `staff.new`, `services.new`, `login`.

## 8. Próxima ação

- EOB/owner: priorizar 1–5 e devolver este relatório com decisões (ou rodar correção cirúrgica
  em tarefa separada — estas linhas estão isoladas das rotas de contrato da Fase 0, que **não**
  serão tocadas nesta etapa).

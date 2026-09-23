# INVESTIGAÇÃO — 40 Erros TypeScript pré-existentes (agendaqui-web)

> **De:** Frontend · **Para:** EOB/Orquestrador · **Data:** 2026-09-21
> **Escopo:** investigação 100% frontend/tipos. NENHUM arquivo alterado.
> **Backend não é necessário** para nenhuma das 5 causas.

---

## DIAGNÓSTICO

Os 40 erros foram **todos** rastreados até a linha exata e agrupados por causa raiz.
Descoberta central: **3 dos 5 grupos compartilham a mesma fonte técnca — o design-system
`Input` bidimensional (`src/components/ui/input.tsx`)**. Não há nenhuma causa no backend.

### Inventário exato (tsc -b, build real)

```
TS2322  = 28   (23 "string→boolean" + 4 "InputProps: label inexistente" + 1 "Resolver")
TS2339  =  3   (latitude, longitude, register)
TS2345  =  2   (SubmitHandler ×2)
TS6133  =  7   (imports órfãos)
TOTAL   = 40
```

> Reconciliar C2: o relatório anterior contou 8 apontando `InputProps`; são **4 locais
> únicos** (cada um gera 2 linhas no console TS). Booking ×2, businesses.new ×2.

---

## CAUSA RAIZ única da FAMÍLIA C1+C2 (27 erros) — CONFIRMADA

O componente `src/components/ui/input.tsx` declara:

```ts
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean          // ← o erro! runtime trata string
  hint?: string
}
```

e renderiza (linha 27 do componente):

```tsx
{error && typeof error === 'string' && <p className="text-destructive">{error}</p>}
```

**O runtime já espera `error` como string** (mensagem de validação). Mas a **interface**
declara `error?: boolean`. As 14 páginas fazem exatamente o correto:

```tsx
<Input error={errors.name?.message} />   // errors.X?.message = string | undefined
```

CONSEQUÊNCIA: TS2322 "Type 'string' is not assignable to type 'boolean'" por cada página
(23 erros) — **mas o componente não tem `label` no InputProps** (4 erros TS2322 "Property
'label'"). C1 e C2 têm a MESMA causa raiz:

1. **`Input` não declara `label`** — as páginas passam `label={...}` esperando que o
   componente renderize o rótulo (como faz o padrão shadcn), mas `InputHTMLAttributes`
   não tem `label`.
2. **`error` tipado como boolean** mas consumido como `string | undefined`.

EVIDÊNCIA: linhas exatas (grep) das 14 páginas erram todas em `error={errors.*?.message}`
→ 23 ocorrências idênticas. Nenhuma se trata de checkbox/boolean real.
⇒ **C1 e C2 = 1 causa raiz única (design system `Input`).**

---

## CAUSA RAIZ C3+C5 (businesses.new — 4 erros) — CONFIRMADA/PROVÁVEL

### C3 — latitude/longitude (2 erros TS2339) — CONFIRMADO

`src/pages/businesses.new.tsx` construiu o payload de `POST /businesses` com as chaves:

```ts
latitude: data.latitude || undefined,
longitude: data.longitude || undefined,
```

mas `businessSchema` (em `src/lib/validations.ts`) **NÃO declara** `latitude`/`longitude`.
E o `setValue` da página **nunca** preenche esses campos (grep: só cep/street/neighborhood/
city/state/document/phone). **São campos-fantasma**: o payload sempre envia `undefined`,
o tipo nega a existência da propriedade em `BusinessFormData`.

⇒ Ou o form deveria incluir `latitude?`/`longitude?` (número) para geocodificação do CEP,
ou o payload deveria simplesmente não referencia-los. **Decisão de design, não de contrato.**
PUNTO: a API aceita `latitude?: number`/`longitude?: number` opcionais (payload já envia).

### C5 — SubmitHandler (2 erros TS2345) — PROVÁVEL

`useForm<BusinessFormData>` definiu preparo:

```ts
resolver: zodResolver(businessSchema),
```

O erro de resolver (TS2322 na linha 37) diz que `zodResolver(businessSchema)` gera um tipo
com `timezone?: string` enquanto o `useForm` esperava `phone?: string` — assinatura clássica
de divergência **input × output type do zod** quando o schema usa `.default()`:
`timezone: z.string().default('America/Sao_Paulo')`.

- o `z.infer` (output) → `timezone: string` (obrigatório)
- o `zodResolver` (input) → `timezone?: string` (default = opcional no input)
→ `Resolver<...>` de tipos que não batem → `handleSubmit(onSubmit)` cascateia TS2345.

EVIDÊNCIA: a linha 37 declara `resolver: zodResolver(businessSchema)`; a linha 133/217 usam
`handleSubmit(onSubmit)`; `.default()` existe no schema (timezone). Provável mecânica dio zod
thumbnail. **Não é o backend.**

> C3 e C5 NÃO são a mesma raiz (C3 = campos ausentes; C5 = resolver/default). Porém as duas
> correções tocan o mesmo arquivo/schema.

---

## CAUSA RAIZ C4 — AUTH REGISTER (1 erro TS2339) — CONFIRMADO (gap de funcionalidade)

`src/pages/register.tsx:14`:

```ts
const { register: registerUser } = useAuth()
```

`AuthContextType` (`src/app/providers/auth.tsx:12-20`) expõe **apenas**:
`user, isAuthenticated, isEmailVerified, isLoading, login, logout, updateUser`.

Não existe `register` nem `signup` no provider. MAS:

- o backend tem `POST /users` (contrato: docs/api-contract.md linhas 39/147);
- existe `usersApi.create(name, email, password, phone)` → `POST users` (services/api/auth.ts:74-78);
- a página `register.tsx` chama `registerUser(name, email, password, phone)` (linha 26).

PORTANTO: o **plumbing existe no service** (`usersApi.create`), mas o **provider não expõe
`register`** — o fluxo foi desenhado e a tela existe, porém a função não foi conectada
ao contexto. Em runtime `registerUser` seria `undefined` → **crash ao abrir a tela de cadastro**.
⇒ **Falta de implementação (linkar `usersApi.create` no provider), não de contrato.**

---

## CAUSA RAIZ C6 — Imports órfãos (7 erros TS6133) — CONFIRMADO

Cada símbolo aparece 1 vez no arquivo (grep) = **só a linha do import**:

```
booking/index.tsx  → User (linha 10), Phone (linha 11)
businesses.new.tsx → Loader2 (linha 13)
forgot-password.tsx→ CalendarDays (linha 5)
home.tsx           → Check (linha 2)
login.tsx          → Loader2 (linha 4)
staff.tsx          → Users (linha 2)
```

Remoção pura. Sem impacto funcional.

---

## MATRIZ DE ERROS (40)

| # Erro | Arquivo | Linha | Causa | Conf. | Causa compartilhada |
|---|---|---|---|---|---|
| 23× TS2322 | 8 páginas (`error={errors.*}`) | spread | `Input.error?: boolean` vs string | CONFIRMADO | C1∩C2 (Input) |
| 4× TS2322 | booking, businesses.new | 385,391,183,275 | `label` não existe em `InputProps` | CONFIRMADO | C1∩C2 (Input) |
| 1× TS2322 | businesses.new | 37 | zodResolver input×output (`.default`) | PROVÁVEL | C5 |
| 2× TS2339 | businesses.new | 57,58 | lat/long fora do schema | CONFIRMADO | C3 |
| 1× TS2339 | register.tsx | 14 | `register` ausente em AuthContextType | CONFIRMADO | C4 |
| 2× TS2345 | businesses.new | 133,217 | resolver/default → handleSubmit | PROVÁVEL | C5 |
| 7× TS6133 | 7 arquivos | — | imports órfãos | CONFIRMADO | C6 |

---

## CAUSAS RAIZ (agrupamento)

```
RAIZ A — design-system Input  (input.tsx):       27 erros  (C1 23 + C2 4)
RAIZ B — businessSchema/resolver (.default + lat): 5 erros  (C3 2 + C5 3)
RAIZ C — AuthContextType sem register:             1 erro   (C4)
RAIZ D — imports órfãos:                           7 erros   (C6)
TOTAL                                             40
```

---

## IMPACTO

**Compilação:** 40 erros bloqueiam `tsc -b` (build) — nada compila hoje.

**Runtime potencial:**
- `register.tsx`: **crash real** se aberta (`registerUser is not a function`) — RAIZ C.
- `Input` com `label`/`error`: hoje o `label` **não é renderizado** (design de RAIZ A).
  As mensagens de erro **não aparecem na UI** (Input ignora por `error?: boolean`) → UX
  de validação quebrada em todas as 8 páginas.
- `businesses.new`: payload envia `latitude/longitude: undefined` — inócuo, mas aponta que
  nenhum dado de localização é coletado (recurso geo ausente).
- RAIZ B é só tipagem (sem efeito runtime direto).

## PLANO DE CORREÇÃO (por causa raiz, não por quantidade)

1. **RAIZ A (`Input`)** — corrigir `InputProps` para suportar `label?: string` e
   `error?: string | boolean` (ou `string | undefined`), e renderizar `<label>` quando
   definido. Corrige 27/40. Sem tocar páginas.
2. **RAIZ B (`businessSchema`)** — decidir: (a) adicionar `latitude?: number`/
   `longitude?: number` ao schema e `setValue` via CEP; ou (b) remover as 2 linhas do
   payload. E tratar `.default('America/Sao_Paulo')` (tipar resolver com
   `zodResolver(businessSchema, { useNativeDate: true })` ou usar `z.input`/`z.output`).
   Corrige 5/40.
3. **RAIZ C (`auth.tsx`)** — expor `register` no provider delegando a `usersApi.create`
   (plumbing já existe). Corrige 1/40 e remove o crash da tela.
4. **RAIZ D** — remover os 7 imports órfãos. Corrige 7/40, mecânico.

## RISCOS

- **RAIZ A:** o `Input` é usado em TODAS as páginas; mudar `error`/`label` sem atualizar a
  render é arriscado. Precisa cuidar para NÃO quebrar a renderização existente (formato de
  `<label>` e mensagem de erro). Maior cuidado necessário.
- **RAIZ C:** adicionar `register` ao provider é seguro, mas confirme que `register.tsx`
  lida com o retorno (a função create não retorna usuário — a tela navega para login após
  sucesso?) antes de fechar.
- **RAIZ B:** remover lat/long do payload muda o contrato que o frontend envia — verificar
  que a API não exige (ainda que opcional). As duas abordagens são seguras.
- **RAIZ D:** sem risco.

## PRÓXIMO PASSO

**Seguros para executar já:** RAIZ D (imports), RAIZ C (register no provider), e parte A
(Input aceitar `string | boolean` no `error`, sem render de label).
**Precisam de decisão do EOB:** RAIZ A render de `<label>` (design); RAIZ B (geolocalização
provável vs remover payload) — uma pergunta de produto, não backend.

---

*Investigação feita com evidência direta de fonte (grep+sed), rodando `tsc -b` limpo.*
